-- =====================================================================
-- UPHSD IT Help Desk — Phase 7.6c (CORRECTIVE): ticket number generation
--
-- ROOT CAUSE (verified live 2026-08-28):
--   The ad-hoc ticket-number trigger currently in the production database
--   re-emits an already-existing number, so every /portal/request INSERT
--   fails with 23505 (tickets_ticket_number_key) and ticket submission is
--   broken for all users. Explicitly supplied ticket numbers ARE respected,
--   which is why imported rows work but normal submissions do not.
--
-- FIX:
--   1. next_ticket_number() SECURITY DEFINER — returns the next free
--      IT-YYYY-NNNNNN using max()+1 over ALL rows (RLS-proof), guarded by a
--      pg_advisory_xact_lock so concurrent submissions cannot race.
--   2. Replaces the ticket-number trigger: it fills ticket_number ONLY when
--      the INSERT did not supply one, using the same collision-safe logic.
--   The app (utils/ticket-number.ts) calls next_ticket_number() via RPC and
--   passes the number explicitly, so both paths are collision-safe.
--
-- Additive/idempotent: no table or data changes. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Collision-safe number generator (sees all rows; RLS-proof).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefix text;
  v_max    int := 0;
  v_num    text;
BEGIN
  v_prefix := 'IT-' || to_char(NOW(), 'YYYY') || '-';
  -- Serialize concurrent generations for this year.
  PERFORM pg_advisory_xact_lock(hashtext('next_ticket_number:' || v_prefix));

  SELECT COALESCE(MAX(NULLIF(regexp_replace(ticket_number, '^\d+-\d+-', ''), '')::int), 0)
    INTO v_max
    FROM public.tickets
   WHERE ticket_number LIKE v_prefix || '%';

  LOOP
    v_num := v_prefix || lpad((v_max + 1)::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.tickets WHERE ticket_number = v_num
    );
    v_max := v_max + 1;
  END LOOP;

  RETURN v_num;
END;
$$;

REVOKE ALL ON FUNCTION public.next_ticket_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_ticket_number() TO authenticated;

-- ---------------------------------------------------------------------
-- 2. Replace the broken trigger. Fills the number only when the INSERT
--    did not already supply one (imports keep their explicit numbers).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.next_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_ticket_number_trigger ON public.tickets;
DROP TRIGGER IF EXISTS ticket_number_trigger ON public.tickets;
-- Drop the previously created (broken) trigger if it used another name.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'public.tickets'::regclass AND NOT tgisinternal
      AND tgname NOT IN ('set_ticket_number_trigger')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.tickets', t.tgname);
  END LOOP;
END $$;

CREATE TRIGGER set_ticket_number_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();

-- =====================================================================
-- VERIFICATION (run after applying, in SQL Editor):
--   SELECT public.next_ticket_number();           -- e.g. IT-2026-000002
--   SELECT public.next_ticket_number() = ...      -- call twice, same txn OK
--   INSERT a ticket as a requester via /portal/request and confirm a new
--   ticket_number is created without a 23505 error.
-- =====================================================================
