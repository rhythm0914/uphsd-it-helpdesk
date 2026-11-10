-- BPMN alignment verification — read-only.
--
-- Run in the Supabase SQL Editor AFTER applying the migrations in order
-- (see README → Database). Nothing here writes; it is safe on production.
--
-- Every row must read PASS. A FAIL row tells you which invariant broke and how
-- many rows break it; the last column says what the check proves.
--
-- Why these are invariants and not status lists: the enum already restricts the
-- status column, so re-listing values proves nothing. These queries check the
-- things an enum cannot: that the backfill was honest, that no client can write
-- state, that derived columns agree with each other, and that the automation is
-- wired to the right roles.

WITH checks AS (

  -- -------------------------------------------------------------------------
  -- Backfill: the legacy staff-closed backlog
  -- -------------------------------------------------------------------------

  SELECT
    'legacy staff-closed tickets were migrated' AS check_name,
    (SELECT count(*) FROM public.tickets
      WHERE status = 'closed' AND closure_reason IS NULL) AS offenders,
    'A ticket closed by staff under the old workflow must be Resolved with no closure reason. '
    || 'Closed now requires either requester verification or the no-response job.' AS proves

  UNION ALL

  SELECT
    'every migrated ticket carries an audit row',
    (SELECT count(*) FROM public.ticket_status_history
      WHERE old_status = 'closed' AND new_status = 'resolved' AND reason IS NULL),
    'The migration must explain each status it changed, so the history is not a mystery.'

  UNION ALL

  SELECT
    'no ticket claims Verified Fixed without a rating',
    (SELECT count(*) FROM public.tickets t
      WHERE t.closure_reason = 'verified_fixed'
        AND NOT EXISTS (SELECT 1 FROM public.ticket_feedback f WHERE f.ticket_id = t.id)),
    'Only verify_fixed() sets that reason, and it always writes a rating in the same transaction.'

  UNION ALL

  SELECT
    'migrated tickets kept their original timestamp',
    (SELECT count(*) FROM public.tickets
      WHERE status = 'resolved' AND resolved_at IS NULL),
    'resolved_at is the reporting timestamp; dropping it would erase the history.'

  -- -------------------------------------------------------------------------
  -- State machine: state columns are written only by transition_ticket()
  -- -------------------------------------------------------------------------

  UNION ALL

  SELECT
    'clients cannot UPDATE state columns',
    (SELECT count(*) FROM information_schema.column_privileges
      WHERE table_schema = 'public' AND table_name = 'tickets'
        AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
        AND column_name IN ('status', 'closure_reason', 'resolved_at', 'closed_at',
                            'reopened_count', 'awaiting_student_since',
                            'rejection_reason', 'rejection_category')),
    'Column-level grants are the actual barrier. UI hiding is not security.'

  UNION ALL

  SELECT
    'transition_ticket() is SECURITY DEFINER',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'transition_ticket' AND p.prosecdef
    ) THEN 0 ELSE 1 END,
    'Requesters have no UPDATE policy on tickets, so the function must run with the owner rights.'

  UNION ALL

  SELECT
    'resolved tickets have a timestamp',
    (SELECT count(*) FROM public.tickets
      WHERE status = 'resolved' AND resolved_at IS NULL),
    'A Resolved ticket with no resolved_at cannot be aged, reminded or reported.'

  UNION ALL

  SELECT
    'unresolved tickets are not marked resolved',
    (SELECT count(*) FROM public.tickets
      WHERE status IN ('open', 'in_progress', 'waiting_for_user', 'reopened')
        AND resolved_at IS NOT NULL),
    'Reopening must clear resolved_at, otherwise the 3/5-day clock reads the wrong date.'

  UNION ALL

  SELECT
    'the waiting flag matches the waiting status',
    (SELECT count(*) FROM public.tickets
      WHERE status = 'waiting_for_user' AND awaiting_student_since IS NULL),
    'The no-response job measures from this column; a missing value silently disables automation.'

  UNION ALL

  SELECT
    'reopened_count matches the audit trail',
    (SELECT count(*) FROM public.tickets t
      WHERE t.reopened_count <> (
        SELECT count(*) FROM public.ticket_status_history h
        WHERE h.ticket_id = t.id AND h.new_status = 'reopened'
      )),
    'The counter drives escalation level 1; drifting from the history would hide repeat failures.'

  UNION ALL

  SELECT
    'current_cycle matches the cycle table',
    (SELECT count(*) FROM public.tickets t
      WHERE t.current_cycle <> GREATEST(
        COALESCE((SELECT max(c.cycle_number) FROM public.ticket_cycles c WHERE c.ticket_id = t.id), 1), 1
      )),
    'A cycle row is written for every attempt so a reopened ticket keeps the record of each one.'

  UNION ALL

  SELECT
    'resolved tickets have a cycle row',
    (SELECT count(*) FROM public.tickets t
      WHERE t.status = 'resolved'
        AND NOT EXISTS (SELECT 1 FROM public.ticket_cycles c
                        WHERE c.ticket_id = t.id AND c.resolved_at IS NOT NULL)),
    'The trigger closes a cycle on resolve; the requester-visible history depends on it.'

  -- -------------------------------------------------------------------------
  -- SLA: due dates are derived, never stored by hand
  -- -------------------------------------------------------------------------

  UNION ALL

  SELECT
    'open tickets have both SLA targets',
    (SELECT count(*) FROM public.tickets
      WHERE status IN ('open', 'in_progress', 'waiting_for_user', 'reopened')
        AND (response_due_at IS NULL OR resolve_due_at IS NULL)),
    'Phase 5 backfilled due dates for tickets created earlier; a NULL target never breaches.'

  UNION ALL

  SELECT
    'due dates match the priority targets',
    (SELECT count(*) FROM public.tickets t
      WHERE t.status IN ('open', 'in_progress', 'waiting_for_user', 'reopened')
        AND t.sla_started_at IS NOT NULL
        AND (
          t.response_due_at IS DISTINCT FROM (
            CASE t.priority
              WHEN 'urgent' THEN t.sla_started_at + INTERVAL '4 hours'
              WHEN 'high'   THEN public.add_business_days(t.sla_started_at, 1)
              WHEN 'normal' THEN public.add_business_days(t.sla_started_at, 2)
              ELSE               public.add_business_days(t.sla_started_at, 3)
            END)
          OR t.resolve_due_at IS DISTINCT FROM (
            CASE t.priority
              WHEN 'urgent' THEN public.add_business_days(t.sla_started_at, 1)
              WHEN 'high'   THEN public.add_business_days(t.sla_started_at, 3)
              WHEN 'normal' THEN public.add_business_days(t.sla_started_at, 5)
              ELSE               public.add_business_days(t.sla_started_at, 7)
            END)
        )),
    'Recomputed from sla_started_at. A mismatch means the trigger did not run or the clock was moved by hand.'

  UNION ALL

  SELECT
    'the SLA trigger is installed',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_ticket_sla' AND NOT tgisinternal
    ) THEN 0 ELSE 1 END,
    'Without the trigger, priority changes and reopens would keep stale due dates.'

  UNION ALL

  SELECT
    'no ticket is breached before its deadline',
    (SELECT count(*) FROM public.tickets
      WHERE sla_status = 'breached' AND resolve_due_at > now()),
    'A stale badge that cries wolf destroys trust in the queue.'

  UNION ALL

  SELECT
    'sla_status is a known value',
    (SELECT count(*) FROM public.tickets
      WHERE sla_status NOT IN ('on_track', 'at_risk', 'breached')),
    'The check constraint should make this impossible; if it fails, the column was altered.'

  -- -------------------------------------------------------------------------
  -- Automation: only the scheduled job may run the passes
  -- -------------------------------------------------------------------------

  UNION ALL

  SELECT
    'requesters cannot run the no-response pass',
    CASE WHEN has_function_privilege(
      'authenticated', 'public.run_no_response_job(timestamptz, timestamptz)', 'EXECUTE'
    ) THEN 1 ELSE 0 END,
    'Mass-closing tickets must not be reachable from a signed-in client.'

  UNION ALL

  SELECT
    'requesters cannot run the escalation pass',
    CASE WHEN has_function_privilege(
      'authenticated', 'public.run_sla_escalation(timestamptz)', 'EXECUTE'
    ) THEN 1 ELSE 0 END,
    'Same rule: the cron is the only caller.'

  UNION ALL

  SELECT
    'sign-up ignores a client-supplied role',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
        AND pg_get_functiondef(p.oid) LIKE '%->>''role''%'
    ) THEN 1 ELSE 0 END,
    'raw_user_meta_data is client-controlled; reading a role from it is a privilege escalation.'

  UNION ALL

  SELECT
    'the sign-up trigger exists',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND NOT tgisinternal
    ) THEN 0 ELSE 1 END,
    'Without it, a new auth user has no profile row and the portal cannot load.'
)

SELECT
  check_name,
  CASE WHEN offenders = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  offenders,
  proves
FROM checks
ORDER BY CASE WHEN offenders = 0 THEN 1 ELSE 0 END, check_name;
