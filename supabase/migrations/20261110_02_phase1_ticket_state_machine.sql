-- Phase 1 (step 2 of 2) — status model, single transition function, audit trail.
--
-- Run 20261110_01_add_ticket_status_values.sql first.
--
-- What this does
--   1. Adds the ticket workflow columns the BPMN process needs.
--   2. Adds structured audit columns (actor role + reason) to status history.
--   3. Adds the satisfaction rating store written only by the transition function.
--   4. Migrates legacy `closed` tickets to `resolved` (there is no requester
--      confirmation artefact anywhere, so claiming "Verified Fixed" would be a lie).
--   5. Creates public.transition_ticket() — the ONE place a status may change.
--   6. Removes the ability to write tickets.status / closure columns directly, so
--      the transition function cannot be bypassed through PostgREST.
--
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------------------
-- 1. Workflow columns
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_closure_reason') THEN
    CREATE TYPE public.ticket_closure_reason AS ENUM ('verified_fixed', 'no_response');
  END IF;
END $$;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closure_reason public.ticket_closure_reason;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS rejection_category TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS reopened_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS awaiting_student_since TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tickets_status_created_at ON public.tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_closure_reason ON public.tickets(closure_reason);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON public.tickets(resolved_at);

-- ---------------------------------------------------------------------------
-- 2. Audit trail: actor role + structured reason
-- ---------------------------------------------------------------------------

ALTER TABLE public.ticket_status_history ADD COLUMN IF NOT EXISTS actor_role public.user_role;
ALTER TABLE public.ticket_status_history ADD COLUMN IF NOT EXISTS reason TEXT;

-- ---------------------------------------------------------------------------
-- 3. Satisfaction rating (part of the "Fix works" transition)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ticket_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL UNIQUE REFERENCES public.tickets(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_feedback ENABLE ROW LEVEL SECURITY;

-- Read-only for clients. Writes happen exclusively inside transition_ticket(),
-- which is SECURITY DEFINER, so there is deliberately no INSERT/UPDATE policy.
DROP POLICY IF EXISTS "Feedback is visible to the requester and staff" ON public.ticket_feedback;
CREATE POLICY "Feedback is visible to the requester and staff" ON public.ticket_feedback
  FOR SELECT USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('it_staff', 'admin', 'manager')
    )
  );

GRANT SELECT ON public.ticket_feedback TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Backfill: legacy `closed` -> `resolved`
--
-- Staff used to close tickets directly. No requester confirmation exists for
-- those rows, so the honest mapping is Resolved (pending verification), not
-- Closed (Verified Fixed). The audit row records why, and resolved_at keeps the
-- original closed_at so reporting does not lose the timestamp.
-- ---------------------------------------------------------------------------

INSERT INTO public.ticket_status_history
  (ticket_id, old_status, new_status, changed_by, notes, actor_role, reason)
SELECT
  t.id,
  'closed',
  'resolved',
  NULL,
  'Migrated: this ticket was closed by staff under the previous workflow, so no requester verification exists.',
  NULL,
  'Legacy staff-closed ticket migrated to Resolved'
FROM public.tickets t
WHERE t.status = 'closed' AND t.closure_reason IS NULL;

UPDATE public.tickets t
SET status = 'resolved',
    resolved_at = COALESCE(t.resolved_at, t.closed_at, t.updated_at),
    closed_at = NULL
WHERE t.status = 'closed' AND t.closure_reason IS NULL;

-- ---------------------------------------------------------------------------
-- 5. The one transition function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.transition_ticket(
  p_ticket_id UUID,
  p_action    TEXT,
  p_payload   JSONB DEFAULT '{}'::JSONB
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_actor        UUID := auth.uid();
  v_jwt_role     TEXT := auth.role();
  v_role         public.user_role;
  v_is_staff     BOOLEAN := FALSE;
  v_is_requester BOOLEAN := FALSE;
  v_is_system    BOOLEAN := (auth.role() = 'service_role');
  v_ticket       public.tickets;
  v_old_status   public.ticket_status;
  v_target       public.ticket_status;
  v_closure      public.ticket_closure_reason;
  v_assignee     UUID;
  v_priority     public.ticket_priority;
  v_message      TEXT;
  v_reason       TEXT;
  v_note         TEXT;
  v_rating       SMALLINT;
  v_comment      TEXT;
  v_audit_note   TEXT;
BEGIN
  IF v_actor IS NULL AND NOT v_is_system THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_actor;
    v_is_staff := v_role IN ('it_staff', 'admin', 'manager');
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  v_is_requester := v_actor IS NOT NULL AND v_ticket.requester_id = v_actor;

  -- Never reveal that a ticket exists to someone who cannot see it: report the
  -- same error as a missing id.
  IF NOT v_is_staff AND NOT v_is_requester AND NOT v_is_system THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  v_old_status := v_ticket.status;
  v_message := NULLIF(btrim(COALESCE(p_payload->>'message', '')), '');
  v_reason  := NULLIF(btrim(COALESCE(p_payload->>'reason', '')), '');
  v_note    := NULLIF(btrim(COALESCE(p_payload->>'resolution_note', '')), '');
  v_comment := NULLIF(btrim(COALESCE(p_payload->>'comment', '')), '');

  CASE p_action
    WHEN 'assign' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can assign tickets' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'reopened') THEN
        RAISE EXCEPTION 'Cannot assign a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      BEGIN
        v_assignee := NULLIF(btrim(COALESCE(p_payload->>'assigned_to', '')), '')::UUID;
      EXCEPTION WHEN others THEN
        v_assignee := NULL;
      END;
      IF v_assignee IS NULL THEN
        RAISE EXCEPTION 'Select a technician to assign this request to.' USING ERRCODE = '22023';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = v_assignee AND p.role IN ('it_staff', 'admin', 'manager')
      ) THEN
        RAISE EXCEPTION 'Assignee must be an IT staff member' USING ERRCODE = '22023';
      END IF;
      IF p_payload ? 'priority' THEN
        BEGIN
          v_priority := (p_payload->>'priority')::public.ticket_priority;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'Invalid priority value' USING ERRCODE = '22023';
        END;
      END IF;
      v_target := 'in_progress'::public.ticket_status;
      v_audit_note := 'Assigned to technician';

    WHEN 'start_work' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can start work on a ticket' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'reopened') THEN
        RAISE EXCEPTION 'Cannot start work on a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      v_target := 'in_progress'::public.ticket_status;
      v_audit_note := 'Work started';

    WHEN 'acknowledge_reopen' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can acknowledge a reopened ticket' USING ERRCODE = '42501';
      END IF;
      IF v_old_status <> 'reopened' THEN
        RAISE EXCEPTION 'Only a reopened ticket can be acknowledged' USING ERRCODE = '22023';
      END IF;
      v_target := 'in_progress'::public.ticket_status;
      v_audit_note := 'Reopened ticket acknowledged';

    WHEN 'request_info' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can request more information' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'reopened') THEN
        RAISE EXCEPTION 'Cannot request information on a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      IF v_message IS NULL THEN
        RAISE EXCEPTION 'Describe the information you need from the requester.' USING ERRCODE = '22023';
      END IF;
      v_target := 'waiting_for_user'::public.ticket_status;
      v_audit_note := 'Additional information requested from requester';

    WHEN 'student_reply' THEN
      IF NOT v_is_requester THEN
        RAISE EXCEPTION 'Only the requester can reply to an information request' USING ERRCODE = '42501';
      END IF;
      IF v_old_status <> 'waiting_for_user' THEN
        RAISE EXCEPTION 'This ticket is not waiting for the requester' USING ERRCODE = '22023';
      END IF;
      -- The message is required by the app; the SQL keeps it optional so the
      -- deprecated requester_provide_info() wrapper (no message arg) keeps
      -- working for any already-loaded client.
      v_target := CASE
        WHEN v_ticket.assigned_to IS NULL THEN 'open'::public.ticket_status
        ELSE 'in_progress'::public.ticket_status
      END;
      v_audit_note := 'Requester provided the requested information';

    WHEN 'resolve' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can mark a ticket resolved' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'reopened') THEN
        RAISE EXCEPTION 'Cannot resolve a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      IF v_note IS NULL THEN
        RAISE EXCEPTION 'A short resolution note is required.' USING ERRCODE = '22023';
      END IF;
      v_target := 'resolved'::public.ticket_status;
      v_audit_note := v_note;

    WHEN 'reject' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can reject a ticket' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'waiting_for_user', 'reopened') THEN
        RAISE EXCEPTION 'Cannot reject a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      IF v_reason IS NULL THEN
        RAISE EXCEPTION 'A rejection reason is required.' USING ERRCODE = '22023';
      END IF;
      v_target := 'rejected'::public.ticket_status;
      v_audit_note := v_reason;

    WHEN 'verify_fixed' THEN
      IF NOT v_is_requester THEN
        RAISE EXCEPTION 'Only the requester can confirm the fix' USING ERRCODE = '42501';
      END IF;
      IF v_old_status <> 'resolved' THEN
        RAISE EXCEPTION 'Only a resolved ticket can be verified' USING ERRCODE = '22023';
      END IF;
      BEGIN
        v_rating := (p_payload->>'rating')::SMALLINT;
      EXCEPTION WHEN others THEN
        v_rating := NULL;
      END;
      IF v_rating IS NULL OR v_rating < 1 OR v_rating > 5 THEN
        RAISE EXCEPTION 'A satisfaction rating from 1 to 5 is required.' USING ERRCODE = '22023';
      END IF;
      v_target := 'closed'::public.ticket_status;
      v_closure := 'verified_fixed'::public.ticket_closure_reason;
      v_audit_note := 'Requester confirmed the fix (Verified Fixed)';

    WHEN 'report_still_broken' THEN
      IF NOT v_is_requester THEN
        RAISE EXCEPTION 'Only the requester can reopen this ticket' USING ERRCODE = '42501';
      END IF;
      IF v_old_status <> 'resolved' THEN
        RAISE EXCEPTION 'Only a resolved ticket can be reopened' USING ERRCODE = '22023';
      END IF;
      IF v_reason IS NULL THEN
        RAISE EXCEPTION 'Please describe what is still broken.' USING ERRCODE = '22023';
      END IF;
      v_target := 'reopened'::public.ticket_status;
      v_audit_note := v_reason;

    WHEN 'close_no_response' THEN
      IF NOT v_is_system THEN
        RAISE EXCEPTION 'Only the automated no-response job can close a ticket this way' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('resolved', 'waiting_for_user') THEN
        RAISE EXCEPTION 'Cannot auto-close a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      v_target := 'closed'::public.ticket_status;
      v_closure := 'no_response'::public.ticket_closure_reason;
      v_audit_note := 'Closed automatically: no response from the requester';

    ELSE
      RAISE EXCEPTION 'Unknown ticket action "%"', p_action USING ERRCODE = '22023';
  END CASE;

  -- Requester-visible conversation entries created by the transition itself, so
  -- the reason a ticket moved is always readable in one transaction.
  IF p_action IN ('request_info', 'student_reply') AND v_message IS NOT NULL THEN
    INSERT INTO public.ticket_messages (ticket_id, sender_id, message, is_internal)
    VALUES (p_ticket_id, v_actor, v_message, FALSE);
  ELSIF p_action = 'reject' THEN
    INSERT INTO public.ticket_messages (ticket_id, sender_id, message, is_internal)
    VALUES (p_ticket_id, v_actor, 'This request was rejected: ' || v_reason, FALSE);
  ELSIF p_action = 'report_still_broken' THEN
    INSERT INTO public.ticket_messages (ticket_id, sender_id, message, is_internal)
    VALUES (p_ticket_id, v_actor, 'The issue is still broken: ' || v_reason, FALSE);
  END IF;

  UPDATE public.tickets t
  SET status = v_target,
      assigned_to = CASE WHEN p_action = 'assign' THEN v_assignee ELSE t.assigned_to END,
      priority = CASE WHEN p_action = 'assign' AND v_priority IS NOT NULL THEN v_priority ELSE t.priority END,
      resolved_at = CASE WHEN v_target = 'resolved' THEN now() ELSE t.resolved_at END,
      closed_at = CASE WHEN v_target = 'closed' THEN now() ELSE NULL END,
      closure_reason = v_closure,
      rejection_reason = CASE WHEN p_action = 'reject' THEN v_reason ELSE t.rejection_reason END,
      rejection_category = CASE
        WHEN p_action = 'reject'
          THEN NULLIF(btrim(COALESCE(p_payload->>'rejection_category', '')), '')
        ELSE t.rejection_category
      END,
      reopened_count = CASE
        WHEN p_action = 'report_still_broken' THEN t.reopened_count + 1
        ELSE t.reopened_count
      END,
      awaiting_student_since = CASE
        WHEN v_target = 'waiting_for_user' THEN now()
        ELSE NULL
      END,
      updated_at = now()
  WHERE t.id = p_ticket_id
  RETURNING * INTO v_ticket;

  INSERT INTO public.ticket_status_history
    (ticket_id, old_status, new_status, changed_by, notes, actor_role, reason)
  VALUES
    (p_ticket_id, v_old_status, v_target, v_actor, v_audit_note, v_role, v_reason);

  IF p_action = 'verify_fixed' THEN
    INSERT INTO public.ticket_feedback (ticket_id, requester_id, rating, comment)
    VALUES (p_ticket_id, v_ticket.requester_id, v_rating, v_comment)
    ON CONFLICT (ticket_id) DO UPDATE
      SET rating = EXCLUDED.rating, comment = EXCLUDED.comment;
  END IF;

  RETURN v_ticket;
END;
$fn$;

REVOKE ALL ON FUNCTION public.transition_ticket(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_ticket(UUID, TEXT, JSONB) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Deprecated alias: keep already-loaded clients working. It delegates to the
--    single transition function; it never writes status itself.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.requester_provide_info(p_ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  PERFORM public.transition_ticket(p_ticket_id, 'student_reply', '{}'::JSONB);
  RETURN TRUE;
END;
$fn$;

REVOKE ALL ON FUNCTION public.requester_provide_info(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requester_provide_info(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Close the bypass: clients may no longer write state columns directly.
--    Status, closure_reason, rejection_*, resolved_at, closed_at,
--    reopened_count and awaiting_student_since are written ONLY by
--    transition_ticket(). Everything else staff legitimately edit stays open.
-- ---------------------------------------------------------------------------

REVOKE UPDATE ON TABLE public.tickets FROM authenticated;
GRANT UPDATE (
  subject,
  description,
  priority,
  assigned_to,
  service_id,
  category_id,
  updated_at
) ON TABLE public.tickets TO authenticated;

DROP POLICY IF EXISTS "IT staff and admins can update tickets" ON public.tickets;
CREATE POLICY "IT staff and admins can update tickets" ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  );
