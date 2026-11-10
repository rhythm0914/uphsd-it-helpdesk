-- Upgrade step for a database that already exists. Skip it on a new project.
--
-- Run this file ON ITS OWN, then run supabase/schema.sql.
--
-- Why it cannot live inside schema.sql: Postgres will not let a transaction use
-- an enum value that the same transaction adds, and the SQL Editor runs a pasted
-- buffer as one transaction. schema.sql uses 'reopened', 'rejected',
-- 'ticket_reminder' and 'ticket_escalated' throughout, so the values must be
-- committed before it runs.
--
-- This file only adds enum values. A separate backfill script
-- (supabase/upgrade/backfill_normal_to_medium.sql) runs afterward to convert
-- existing 'normal' tickets to 'medium'.
--
-- Each ALTER is guarded because an older database may not have every type yet;
-- schema.sql creates the missing ones. Safe to re-run.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'reopened';
    ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'rejected';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ticket_reminder';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ticket_escalated';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ticket_urgent_verified';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ticket_urgent_downgraded';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    ALTER TYPE public.ticket_priority ADD VALUE IF NOT EXISTS 'medium';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_closure_reason') THEN
    ALTER TYPE public.ticket_closure_reason ADD VALUE IF NOT EXISTS 'rejected';
    ALTER TYPE public.ticket_closure_reason ADD VALUE IF NOT EXISTS 'cancelled_by_requester';
  END IF;
END $$;
