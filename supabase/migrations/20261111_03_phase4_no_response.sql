-- Phase 4 — the automated no-response pass.
--
-- Run AFTER 20261111_02_enum_values.sql (which adds notification_type values).
--
-- One function does the whole pass, in one transaction per call:
--   * 3 days after a request starts waiting on the requester -> one reminder
--   * 5 days after that                                    -> closed, No Response
--
-- Why the work is SQL and not JavaScript in the Worker: the close must go
-- through public.transition_ticket(), which is the only writer of ticket state.
-- Running the pass inside the database keeps the reminder, the notification and
-- the close in the same transaction, and means a replayed cron cannot
-- double-close anything.
--
-- Cutover guard: tickets whose waiting period started before the cutover are
-- ignored. Phase 1 migrated every legacy staff-closed ticket to Resolved, so
-- without this the first run would re-close the entire historical backlog.
--
-- Safe to re-run.

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tickets_awaiting_since
  ON public.tickets(awaiting_student_since)
  WHERE awaiting_student_since IS NOT NULL;

-- ---------------------------------------------------------------------------
-- The pass
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_no_response_job(
  p_now     TIMESTAMPTZ DEFAULT now(),
  p_cutover TIMESTAMPTZ DEFAULT '2026-11-11T00:00:00Z'
)
RETURNS TABLE (reminded INTEGER, closed INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  t          public.tickets;
  v_start    TIMESTAMPTZ;
  v_reminded INTEGER := 0;
  v_closed   INTEGER := 0;
  v_reminded_this_cycle BOOLEAN;
BEGIN
  -- Only the scheduled job (service_role) may run this. A normal user calling
  -- it must not be able to mass-close tickets.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the scheduled job can run the no-response pass'
      USING ERRCODE = '42501';
  END IF;

  FOR t IN
    SELECT *
    FROM public.tickets
    WHERE status IN ('resolved', 'waiting_for_user')
      AND COALESCE(resolved_at, awaiting_student_since) >= p_cutover
    FOR UPDATE SKIP LOCKED
  LOOP
    v_start := GREATEST(
      COALESCE(t.resolved_at, t.awaiting_student_since),
      COALESCE(t.awaiting_student_since, t.resolved_at)
    );

    CONTINUE WHEN v_start IS NULL;

    -- 5 days: close as No Response. transition_ticket() sets closure_reason,
    -- writes the audit row and fires the notification trigger.
    IF p_now - v_start >= INTERVAL '5 days' THEN
      PERFORM public.transition_ticket(t.id, 'close_no_response', '{}'::JSONB);
      v_closed := v_closed + 1;
      CONTINUE;
    END IF;

    -- 3 days: one reminder per waiting period.
    IF p_now - v_start >= INTERVAL '3 days' THEN
      v_reminded_this_cycle := t.reminder_sent_at IS NOT NULL
        AND t.reminder_sent_at >= v_start;

      IF NOT v_reminded_this_cycle THEN
        UPDATE public.tickets
           SET reminder_sent_at = p_now
         WHERE id = t.id;

        INSERT INTO public.notifications (user_id, ticket_id, type, title, body)
        VALUES (
          t.requester_id,
          t.id,
          'ticket_reminder',
          'We still need your reply on ' || t.ticket_number,
          'This request will be closed automatically in 2 days if we do not hear from you. '
            || 'Open it and reply, or choose "Fix works" / "Still broken" if it was resolved.'
        );
        v_reminded := v_reminded + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_reminded, v_closed;
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_no_response_job(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_no_response_job(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
