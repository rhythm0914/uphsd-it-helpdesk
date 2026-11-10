-- Adds one closure reason: `administrative_closure`.
--
-- Why a new value instead of reusing one:
--   * `verified_fixed` would be a lie — no requester ever confirmed these;
--   * `no_response` would be a different lie — it names the 5-day automation,
--     and these tickets were closed by staff long before it existed.
--
-- No transition action produces this reason. It is written only by the one-off
-- retirement script (supabase/one-off/retire_legacy_tickets.sql), because
-- closing without verification is a historical cleanup, not a workflow step.
--
-- Must run on its own: Postgres cannot use a new enum value in the transaction
-- that adds it, and the retirement script uses it.
--
-- Safe to re-run.

ALTER TYPE public.ticket_closure_reason ADD VALUE IF NOT EXISTS 'administrative_closure';
