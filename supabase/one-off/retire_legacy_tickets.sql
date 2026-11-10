-- ONE-OFF — retire the pre-workflow backlog. Optional, run once, by an administrator.
--
-- This is deliberately NOT part of the migration chain. The migrations describe
-- the schema; retiring old tickets is a business decision, so it should be
-- visible and deliberate rather than a side effect of deploying.
--
-- Prerequisite: the migrations (through 20261111_06_add_administrative_closure).
-- Re-running this file is a no-op.

-- ===========================================================================
-- WHAT IT DOES, PER TICKET
--   status          resolved  ->  closed
--   closure_reason  NULL      ->  administrative_closure
--   closed_at                 ->  kept if already set, otherwise now()
--   one row in ticket_status_history explaining why
--   the open work cycle ends with outcome 'administrative_closure' (trigger)
--
-- WHICH TICKETS
--   status = 'resolved'
--   closure_reason IS NULL
--   resolved_at before the automation cutover (2026-11-11)
--
--   Those are exactly the rows Phase 1 migrated out of the old staff-closed
--   state. Nobody ever verified a fix, and the no-response job ignores anything
--   that predates the cutover on purpose, so without this they sit in the
--   requesters' "please verify" list forever.
--
-- WHAT IT DOES NOT DO
--   * Leaves alone every ticket resolved after the cutover — those can still be
--     verified, and the 3/5-day clock governs them normally.
--   * Sends no notification. These are historical rows, not news.
--   * Records no rating. Reports count only verified_fixed as a success, so
--     retiring these does not inflate resolution time.
--
-- ROLLING BACK
--   The audit row is the record of what changed, so reversal is exact:
--     select ticket_id from public.ticket_status_history
--     where reason = 'Administrative retirement of a pre-workflow ticket';
--   then set those tickets back to status 'resolved', closure_reason NULL.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- STEP 1 — PREVIEW. Run this on its own and read the numbers first.
-- ---------------------------------------------------------------------------

SELECT
  count(*)                                        AS tickets_to_retire,
  min(resolved_at)                                AS oldest_resolved,
  max(resolved_at)                                AS newest_resolved,
  count(*) FILTER (WHERE resolved_at > now())     AS resolved_in_the_future
FROM public.tickets
WHERE status = 'resolved'
  AND closure_reason IS NULL
  AND resolved_at IS NOT NULL
  AND resolved_at < TIMESTAMPTZ '2026-11-11T00:00:00Z';


-- ---------------------------------------------------------------------------
-- STEP 2 — RETIRE. One transaction: either every row is retired or none is.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_cutover CONSTANT TIMESTAMPTZ := TIMESTAMPTZ '2026-11-11T00:00:00Z';
  v_reason  CONSTANT TEXT := 'Administrative retirement of a pre-workflow ticket';
  v_note    CONSTANT TEXT :=
    'Retired without requester verification: closed by staff under the pre-2026 '
    'workflow, before the requester-confirmation step existed.';
  t        RECORD;
  v_count  INTEGER := 0;
BEGIN
  FOR t IN
    SELECT id
    FROM public.tickets
    WHERE status = 'resolved'
      AND closure_reason IS NULL
      AND resolved_at IS NOT NULL
      AND resolved_at < v_cutover
    ORDER BY resolved_at
    FOR UPDATE
  LOOP
    -- The ticket is updated first so the status-history trigger, which runs on
    -- insert, sees the new closure_reason and ends the work cycle with it.
    UPDATE public.tickets
       SET status          = 'closed',
           closure_reason  = 'administrative_closure'::public.ticket_closure_reason,
           closed_at       = COALESCE(closed_at, now()),
           updated_at      = now()
     WHERE id = t.id;

    INSERT INTO public.ticket_status_history
      (ticket_id, old_status, new_status, changed_by, notes, actor_role, reason)
    VALUES
      (t.id, 'resolved', 'closed', NULL, v_note, NULL, v_reason);

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Retired % ticket(s).', v_count;
END $$;


-- ---------------------------------------------------------------------------
-- STEP 3 — VERIFY. Expect remaining = 0.
-- ---------------------------------------------------------------------------

SELECT
  (SELECT count(*) FROM public.tickets
    WHERE status = 'closed' AND closure_reason = 'administrative_closure') AS retired,
  (SELECT count(*) FROM public.tickets
    WHERE status = 'resolved' AND closure_reason IS NULL
      AND resolved_at < TIMESTAMPTZ '2026-11-11T00:00:00Z')               AS remaining,
  (SELECT count(*) FROM public.ticket_status_history
    WHERE reason = 'Administrative retirement of a pre-workflow ticket')  AS audit_rows;
