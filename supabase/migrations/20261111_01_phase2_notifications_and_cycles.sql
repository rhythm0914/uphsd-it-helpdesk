-- Phase 2 — notifications, work cycles, and SLA clock restart.
--
-- Run AFTER 20261110_02_phase1_ticket_state_machine.sql.
--
-- What this does
--   1. public.notifications: one in-app inbox row per recipient.
--   2. tickets.sla_started_at + tickets.current_cycle: the clock that restarts
--      when a requester reopens a ticket (Phase 5 derives due dates from it).
--   3. public.ticket_cycles: durable per-cycle history, so a reopened ticket
--      keeps the record of every prior attempt.
--   4. A trigger on ticket_status_history that maintains both, so NO transition
--      path can move a ticket without notifying and without recording the cycle.
--      It fires inside the same transaction as the transition, which is what
--      makes "atomic" true.
--
-- Email is NOT sent: this project has no email provider configured. All
-- notifications are in-app. See docs/CHANGELOG_ALIGNMENT.md.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Notifications
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM (
      'ticket_resolved',
      'ticket_verified',
      'ticket_reopened',
      'ticket_info_requested',
      'ticket_reply',
      'ticket_rejected',
      'ticket_assigned'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark their own notifications read" ON public.notifications;
CREATE POLICY "Users can mark their own notifications read" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Clients may read their inbox and set read_at. Nothing else. Rows are only
-- created by the transition trigger (SECURITY DEFINER), so a user cannot forge
-- a notification.
REVOKE ALL ON TABLE public.notifications FROM authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.notifications TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. SLA clock + cycle counter
-- ---------------------------------------------------------------------------

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS current_cycle INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_started_at TIMESTAMPTZ;

UPDATE public.tickets
SET sla_started_at = created_at
WHERE sla_started_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Work cycles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ticket_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_ticket_cycles_ticket
  ON public.ticket_cycles(ticket_id, cycle_number);

ALTER TABLE public.ticket_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cycles are visible with the ticket" ON public.ticket_cycles;
CREATE POLICY "Cycles are visible with the ticket" ON public.ticket_cycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_cycles.ticket_id
        AND (
          t.requester_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('it_staff', 'admin', 'manager')
          )
        )
    )
  );

REVOKE ALL ON TABLE public.ticket_cycles FROM authenticated;
GRANT SELECT ON TABLE public.ticket_cycles TO authenticated;

-- Backfill one cycle row for every existing ticket so the history renders.
INSERT INTO public.ticket_cycles
  (ticket_id, cycle_number, started_at, resolved_at, ended_at, outcome)
SELECT
  t.id,
  1,
  COALESCE(t.sla_started_at, t.created_at),
  t.resolved_at,
  t.closed_at,
  CASE t.status::TEXT
    WHEN 'closed' THEN COALESCE(t.closure_reason::TEXT, 'closed')
    WHEN 'rejected' THEN 'rejected'
    WHEN 'resolved' THEN 'resolved'
    ELSE 'open'
  END
FROM public.tickets t
ON CONFLICT (ticket_id, cycle_number) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Transition side effects: cycles + notifications
-- ---------------------------------------------------------------------------

-- Escalation recipients while there is no dedicated Supervisor role (Phase 5
-- adds it). Admin/manager are the operational escalation point today.
CREATE OR REPLACE FUNCTION public.admin_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT COALESCE(array_agg(p.id), ARRAY[]::UUID[])
  FROM public.profiles p
  WHERE p.role IN ('admin', 'manager');
$fn$;

REVOKE ALL ON FUNCTION public.admin_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_ids() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.on_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  t            public.tickets;
  v_recipients UUID[] := ARRAY[]::UUID[];
  v_type       public.notification_type;
  v_title      TEXT;
  v_body       TEXT;
  v_outcome    TEXT;
BEGIN
  SELECT * INTO t FROM public.tickets WHERE id = NEW.ticket_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- ---------------- work cycles ----------------
  IF NEW.new_status = 'resolved' THEN
    INSERT INTO public.ticket_cycles
      (ticket_id, cycle_number, started_at, resolved_at, outcome)
    VALUES
      (NEW.ticket_id, t.current_cycle, COALESCE(t.sla_started_at, t.created_at), NOW(), 'resolved')
    ON CONFLICT (ticket_id, cycle_number)
      DO UPDATE SET resolved_at = NOW(), outcome = 'resolved';

  ELSIF NEW.new_status = 'reopened' THEN
    -- The current cycle ends as "reopened"; a fresh cycle starts now and the
    -- SLA clock restarts (Phase 5 derives due dates from sla_started_at).
    UPDATE public.ticket_cycles
       SET ended_at = NOW(), outcome = 'reopened'
     WHERE ticket_id = NEW.ticket_id AND cycle_number = t.current_cycle;

    UPDATE public.tickets
       SET current_cycle = t.current_cycle + 1,
           sla_started_at = NOW(),
           resolved_at = NULL
     WHERE id = NEW.ticket_id;

    INSERT INTO public.ticket_cycles
      (ticket_id, cycle_number, started_at, outcome)
    VALUES
      (NEW.ticket_id, t.current_cycle + 1, NOW(), 'open')
    ON CONFLICT (ticket_id, cycle_number) DO NOTHING;

  ELSIF NEW.new_status IN ('closed', 'rejected') THEN
    v_outcome := CASE
      WHEN NEW.new_status = 'rejected' THEN 'rejected'
      ELSE COALESCE(t.closure_reason::TEXT, 'closed')
    END;
    UPDATE public.ticket_cycles
       SET ended_at = NOW(), outcome = v_outcome
     WHERE ticket_id = NEW.ticket_id AND cycle_number = t.current_cycle;
  END IF;

  -- ---------------- notifications ----------------
  IF NEW.new_status = 'resolved' THEN
    v_type    := 'ticket_resolved';
    v_title   := 'Verify your request ' || t.ticket_number;
    v_body    := COALESCE(NEW.notes, 'IT marked your request resolved.') ||
                 ' Please choose "Fix works" or "Still broken".';
    v_recipients := ARRAY[t.requester_id];

  ELSIF NEW.new_status = 'closed' AND t.closure_reason = 'verified_fixed' THEN
    v_type    := 'ticket_verified';
    v_title   := 'Fix confirmed on ' || t.ticket_number;
    v_body    := 'The requester confirmed the fix. This ticket is Closed (Verified Fixed).';
    v_recipients := ARRAY[t.assigned_to];
    IF t.assigned_to IS NULL THEN
      v_recipients := public.admin_ids();
    END IF;

  ELSIF NEW.new_status = 'reopened' THEN
    v_type    := 'ticket_reopened';
    v_title   := 'Reopened: ' || t.ticket_number;
    v_body    := COALESCE(NEW.reason, NEW.notes, 'The requester reports the issue is still broken.');
    v_recipients := ARRAY[t.assigned_to];
    IF t.assigned_to IS NULL THEN
      v_recipients := public.admin_ids();
    END IF;
    -- 2+ reopens escalate beyond the technician to the escalation recipients.
    IF t.reopened_count >= 2 THEN
      v_recipients := v_recipients || public.admin_ids();
    END IF;

  ELSIF NEW.new_status = 'waiting_for_user' THEN
    v_type    := 'ticket_info_requested';
    v_title   := 'More information needed for ' || t.ticket_number;
    v_body    := COALESCE(NEW.notes, 'IT needs more information about your request.');
    v_recipients := ARRAY[t.requester_id];

  ELSIF NEW.new_status = 'rejected' THEN
    v_type    := 'ticket_rejected';
    v_title   := 'Request ' || t.ticket_number || ' was rejected';
    v_body    := COALESCE(NEW.reason, NEW.notes, 'This request was rejected.');
    v_recipients := ARRAY[t.requester_id];

  ELSIF NEW.new_status = 'in_progress' AND NEW.old_status = 'waiting_for_user' THEN
    v_type    := 'ticket_reply';
    v_title   := 'Requester replied to ' || t.ticket_number;
    v_body    := 'The requester provided the requested information.';
    v_recipients := ARRAY[t.assigned_to];
    IF t.assigned_to IS NULL THEN
      v_recipients := public.admin_ids();
    END IF;

  ELSIF NEW.new_status = 'in_progress' THEN
    v_type    := 'ticket_assigned';
    v_title   := 'Assigned: ' || t.ticket_number;
    v_body    := 'You are the technician for this request.';
    v_recipients := ARRAY[t.assigned_to];

  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, ticket_id, type, title, body)
  SELECT DISTINCT u, NEW.ticket_id, v_type, v_title, v_body
  FROM unnest(v_recipients) AS u
  WHERE u IS NOT NULL
    AND (NEW.changed_by IS NULL OR u <> NEW.changed_by);

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_ticket_status_change ON public.ticket_status_history;
CREATE TRIGGER trg_ticket_status_change
  AFTER INSERT ON public.ticket_status_history
  FOR EACH ROW
  EXECUTE FUNCTION public.on_ticket_status_change();
