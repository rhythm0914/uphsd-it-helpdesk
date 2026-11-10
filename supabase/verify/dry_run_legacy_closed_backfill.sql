-- ===========================================================================
-- DRY-RUN REPORT: backfill of legacy `closed` tickets
-- ===========================================================================
-- DO NOT EXECUTE THIS FILE. It is a read-only report showing what a backfill
-- would touch, by outcome. Every row here is a candidate for migration from
-- `status = 'closed'` to either `resolved` (no requester confirmation exists)
-- or `closed` with closure_reason = 'verified_fixed' (a rating exists).
--
-- Per the honest-mapping rule (Phase 1), no legacy `closed` ticket can become
-- `verified_fixed` because no requester ever confirmed a fix. All of them
-- become `resolved` (pending verification), and none become `verified_fixed`.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Count of legacy `closed` tickets that would be backfilled
-- ---------------------------------------------------------------------------

SELECT
  count(*) AS total_legacy_closed_tickets
FROM public.tickets
WHERE status = 'closed'
  AND closure_reason IS NULL;


-- ---------------------------------------------------------------------------
-- STEP 2: Breakdown by what each would become
-- ---------------------------------------------------------------------------

-- All legacy closed tickets -> Resolved (no verification artefact exists).
-- None can be Verified Fixed because no ticket_feedback row exists for them.
SELECT
  'resolved (pending verification)' AS outcome,
  count(*) AS ticket_count
FROM public.tickets
WHERE status = 'closed'
  AND closure_reason IS NULL

UNION ALL

SELECT
  'closed (verified_fixed)' AS outcome,
  count(*) AS ticket_count
FROM public.tickets t
WHERE t.status = 'closed'
  AND t.closure_reason = 'verified_fixed'
  AND EXISTS (
    SELECT 1 FROM public.ticket_feedback f WHERE f.ticket_id = t.id
  );

-- Expected result: every row lands in the 'resolved' bucket; the
-- 'verified_fixed' bucket should be 0.


-- ---------------------------------------------------------------------------
-- STEP 3: Sample of affected tickets (for manual review, not execution)
-- ---------------------------------------------------------------------------

SELECT
  id,
  ticket_number,
  requester_id,
  assigned_to,
  subject,
  status,
  closed_at,
  updated_at
FROM public.tickets
WHERE status = 'closed'
  AND closure_reason IS NULL
ORDER BY closed_at NULLS LAST, updated_at
LIMIT 50;


-- ---------------------------------------------------------------------------
-- STEP 4: The actual migration SQL (shown for review only — DO NOT RUN)
-- ---------------------------------------------------------------------------
--
-- If you decide to proceed, this is what would run:
--
--   BEGIN;
--
--   -- 1) Write audit rows explaining the migration.
--   INSERT INTO public.ticket_status_history
--     (ticket_id, old_status, new_status, changed_by, notes, actor_role, reason)
--   SELECT
--     t.id,
--     'closed',
--     'resolved',
--     NULL,
--     'Migrated: this ticket was closed by staff under the previous workflow, so no requester verification exists.',
--     NULL,
--     'Legacy staff-closed ticket migrated to Resolved'
--   FROM public.tickets t
--   WHERE t.status = 'closed' AND t.closure_reason IS NULL;
--
--   -- 2) Move the tickets to Resolved, preserving the original closed timestamp.
--   UPDATE public.tickets t
--   SET status = 'resolved',
--       resolved_at = COALESCE(t.resolved_at, t.closed_at, t.updated_at),
--       closed_at = NULL
--   WHERE t.status = 'closed' AND t.closure_reason IS NULL;
--
--   COMMIT;
