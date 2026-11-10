-- Backfill existing 'normal' tickets to 'medium'.
--
-- Run this AFTER supabase/schema.sql (so 'medium' is already committed and can
-- be referenced). Safe to re-run.
--
-- 'normal' stays in the enum for backward compatibility; all new writes use
-- 'medium'.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tickets'
  ) THEN
    UPDATE public.tickets
    SET priority = 'medium'::public.ticket_priority
    WHERE priority = 'normal'::public.ticket_priority;
  END IF;
END $$;
