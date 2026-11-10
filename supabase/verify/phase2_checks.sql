-- Phase 2 verification (read-only unless noted). Run in the Supabase SQL
-- Editor after applying 20261111_01_phase2_notifications_and_cycles.sql.
--
-- These are checks, not migrations. Every query below answers one Phase 2
-- requirement; compare the result with the comment above it.

-- 1. Staff still cannot write the state columns directly.
--    Expect NO rows containing status, closure_reason, closed_at, resolved_at,
--    reopened_count, awaiting_student_since.
SELECT column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_name = 'tickets'
  AND grantee = 'authenticated'
  AND privilege_type = 'UPDATE'
ORDER BY column_name;

-- 2. Everything a state change produces lives in one transaction, so cycles and
--    notifications must be consistent with the history table.
--    Expect zero.
SELECT count(*) AS transitions_without_cycle
FROM public.ticket_status_history h
JOIN public.tickets t ON t.id = h.ticket_id
WHERE h.new_status = 'resolved'
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_cycles c
    WHERE c.ticket_id = h.ticket_id AND c.resolved_at IS NOT NULL
  );

-- 3. No-response closes must never be counted as verified fixes.
--    Expect zero.
SELECT count(*) AS no_response_marked_verified
FROM public.tickets
WHERE closure_reason = 'no_response'
  AND (SELECT count(*) FROM public.ticket_feedback f WHERE f.ticket_id = tickets.id) > 0;

-- 4. Every resolved ticket that was verified has exactly one rating.
--    Expect zero (a rating can only come from verify_fixed).
SELECT count(*) AS verified_without_rating
FROM public.tickets t
WHERE t.closure_reason = 'verified_fixed'
  AND NOT EXISTS (SELECT 1 FROM public.ticket_feedback f WHERE f.ticket_id = t.id);

-- 5. Reopened tickets must have restarted the clock and increased the counter.
--    Expect zero.
SELECT count(*) AS reopened_without_restart
FROM public.tickets
WHERE status = 'reopened' AND (reopened_count = 0 OR current_cycle < 2);

-- 6. Inspect the most recent notifications (sanity check of recipients/wording).
SELECT n.created_at, n.type, n.title, p.full_name AS recipient, n.read_at
FROM public.notifications n
JOIN public.profiles p ON p.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 20;

-- 7. MANUAL (will raise an exception by design):
--    As a staff user's JWT, this must fail with 42501 because close_no_response
--    is system-only and staff have no path to Closed. Run as an authenticated
--    staff role, not as service_role.
-- SELECT public.transition_ticket(
--   '00000000-0000-0000-0000-000000000000'::uuid, 'close_no_response', '{}'::jsonb
-- );
