-- Phase 2/5 enum additions — MUST run on its own.
--
-- Postgres refuses to use a new enum value in the same transaction that adds
-- it, so this file contains ONLY the ALTER TYPE statements. Run it, then run
-- the migration that uses the new values.
--
-- New values
--   notification_type.ticket_reminder    3-day "still waiting on you" nudge
--   notification_type.ticket_escalated   SLA / repeat-reopen escalation
--
-- Safe to re-run (IF NOT EXISTS).
--
-- NOTE ON "SUPERVISOR": escalation is NOT a new user_role value. A supervisor
-- must be able to act on an escalated ticket, and transition_ticket() only
-- accepts existing staff roles; adding a role that the state machine rejects
-- would create a console nobody can use. Supervisors are therefore staff
-- accounts marked with profiles.staff_title = 'supervisor' (see the Phase 5
-- migration), which keeps full acting rights and is what escalation targets.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ticket_reminder';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ticket_escalated';
