-- Phase 5 — SLA clocks, urgent path, supervisor duty, escalation.
--
-- Run AFTER 20261111_02_enum_values.sql and 20261111_03_phase4_no_response.sql.
--
-- Targets (placeholders from the brief, mirrored in utils/tickets/sla.ts):
--   Urgent  response 4 hours (24/7)   resolve 1 business day
--   High    response 1 business day   resolve 3 business days
--   Normal  response 2 business days  resolve 5 business days
--   Low     response 3 business days  resolve 7 business days
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Supervisor duty: a title on a staff account, not a new role
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_on_call BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_staff_title_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_staff_title_check
      CHECK (staff_title IS NULL OR staff_title IN ('technician', 'supervisor'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_supervisors
  ON public.profiles(is_on_call)
  WHERE staff_title = 'supervisor';

-- ---------------------------------------------------------------------------
-- 2. SLA + triage columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolve_due_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_status TEXT NOT NULL DEFAULT 'on_track';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0;
-- Why the requester said this is urgent (required for the urgent path).
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS priority_justification TEXT;
-- student vs employee, so the two populations can be reported separately.
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS requester_pool TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_sla_status_check') THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_sla_status_check
      CHECK (sla_status IN ('on_track', 'at_risk', 'breached'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_requester_pool_check') THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_requester_pool_check
      CHECK (requester_pool IS NULL OR requester_pool IN ('student', 'employee'));
  END IF;
END $$;

UPDATE public.tickets t
SET requester_pool = CASE WHEN p.role = 'employee' THEN 'employee' ELSE 'student' END
FROM public.profiles p
WHERE p.id = t.requester_id AND t.requester_pool IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_sla_open
  ON public.tickets(response_due_at, resolve_due_at)
  WHERE status IN ('open', 'in_progress', 'reopened', 'waiting_for_user');

-- ---------------------------------------------------------------------------
-- 3. Business-day maths (Asia/Manila has no DST, so calendar days are exact)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_business_day(d TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT EXTRACT(ISODOW FROM (d AT TIME ZONE 'Asia/Manila')) BETWEEN 1 AND 5;
$fn$;

CREATE OR REPLACE FUNCTION public.add_business_days(p_start TIMESTAMPTZ, p_days INTEGER)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  v TIMESTAMPTZ := p_start;
  i INTEGER := 0;
BEGIN
  IF p_days IS NULL OR p_days <= 0 THEN
    RETURN v;
  END IF;
  WHILE i < p_days LOOP
    v := v + INTERVAL '1 day';
    WHILE NOT public.is_business_day(v) LOOP
      v := v + INTERVAL '1 day';
    END LOOP;
    i := i + 1;
  END LOOP;
  RETURN v;
END;
$fn$;

-- The clock restarts on reopen (the Phase 2 trigger sets sla_started_at = now()
-- and clears resolved_at), so due dates are always derived, never carried over.
CREATE OR REPLACE FUNCTION public.set_ticket_sla()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_start TIMESTAMPTZ := COALESCE(NEW.sla_started_at, NEW.created_at, now());
BEGIN
  IF NEW.status IN ('closed', 'rejected') THEN
    RETURN NEW;
  END IF;

  NEW.sla_started_at := v_start;

  NEW.response_due_at := CASE NEW.priority
    WHEN 'urgent' THEN v_start + INTERVAL '4 hours'
    WHEN 'high'   THEN public.add_business_days(v_start, 1)
    WHEN 'normal' THEN public.add_business_days(v_start, 2)
    ELSE               public.add_business_days(v_start, 3)
  END;

  NEW.resolve_due_at := CASE NEW.priority
    WHEN 'urgent' THEN public.add_business_days(v_start, 1)
    WHEN 'high'   THEN public.add_business_days(v_start, 3)
    WHEN 'normal' THEN public.add_business_days(v_start, 5)
    ELSE               public.add_business_days(v_start, 7)
  END;

  NEW.sla_status := CASE
    WHEN now() >= NEW.resolve_due_at THEN 'breached'
    WHEN now() >= NEW.resolve_due_at - (NEW.resolve_due_at - v_start) * 0.2 THEN 'at_risk'
    ELSE 'on_track'
  END;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_ticket_sla ON public.tickets;
CREATE TRIGGER trg_ticket_sla
  BEFORE INSERT OR UPDATE OF priority, sla_started_at, status ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_sla();

-- Backfill due dates for tickets created before this migration.
UPDATE public.tickets
SET priority = priority
WHERE response_due_at IS NULL AND status NOT IN ('closed', 'rejected');

-- ---------------------------------------------------------------------------
-- 4. Escalation recipients + the escalation pass
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.escalation_recipients()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  WITH supervisors AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.staff_title = 'supervisor'
      AND p.role IN ('it_staff', 'admin', 'manager')
  ),
  fallback AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.role IN ('admin', 'manager')
  )
  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::UUID[])
  FROM (
    SELECT id FROM supervisors WHERE EXISTS (SELECT 1 FROM supervisors)
    UNION
    SELECT id FROM fallback
  ) AS recipients;
$fn$;

REVOKE ALL ON FUNCTION public.escalation_recipients() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escalation_recipients() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.run_sla_escalation(p_now TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (escalated INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  t            public.tickets;
  v_level      INTEGER;
  v_recipients UUID[];
  v_count      INTEGER := 0;
  v_reason     TEXT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the scheduled job can run the escalation pass'
      USING ERRCODE = '42501';
  END IF;

  -- Keep the badge honest even for tickets whose priority never changes.
  UPDATE public.tickets
  SET sla_status = CASE
        WHEN p_now >= resolve_due_at THEN 'breached'
        WHEN p_now >= resolve_due_at - (resolve_due_at - sla_started_at) * 0.2 THEN 'at_risk'
        ELSE 'on_track'
      END
  WHERE status IN ('open', 'in_progress', 'reopened', 'waiting_for_user')
    AND resolve_due_at IS NOT NULL
    AND sla_started_at IS NOT NULL;

  FOR t IN
    SELECT *
    FROM public.tickets
    WHERE status IN ('open', 'in_progress', 'reopened', 'waiting_for_user')
    FOR UPDATE SKIP LOCKED
  LOOP
    v_level := CASE
      WHEN t.resolve_due_at IS NOT NULL AND p_now >= t.resolve_due_at THEN 3
      WHEN t.response_due_at IS NOT NULL AND p_now >= t.response_due_at THEN 2
      WHEN t.reopened_count >= 2 THEN 1
      ELSE 0
    END;

    CONTINUE WHEN v_level <= 0 OR v_level <= COALESCE(t.escalation_level, 0);

    v_reason := CASE v_level
      WHEN 3 THEN 'Resolution target passed'
      WHEN 2 THEN 'First-response target passed'
      ELSE 'Reopened more than once'
    END;

    UPDATE public.tickets
    SET escalation_level = v_level,
        escalated_at = COALESCE(escalated_at, p_now),
        sla_status = CASE WHEN v_level >= 2 THEN 'breached' ELSE 'at_risk' END
    WHERE id = t.id;

    v_recipients := public.escalation_recipients()
      || ARRAY[t.assigned_to];

    INSERT INTO public.notifications (user_id, ticket_id, type, title, body)
    SELECT DISTINCT u, t.id, 'ticket_escalated',
      'Escalation: ' || t.ticket_number,
      v_reason || '. ' || t.subject
    FROM unnest(v_recipients) AS u
    WHERE u IS NOT NULL;

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_sla_escalation(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_sla_escalation(TIMESTAMPTZ) TO service_role;
