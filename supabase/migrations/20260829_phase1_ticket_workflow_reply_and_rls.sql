-- =====================================================================
-- UPHSD IT Help Desk — Phase 7.6b: Ticket workflow reply + RLS hardening
--
-- Completes the IT Help Desk ticket lifecycle:
--   1. Requesters can REPLY to an existing ticket (no new ticket needed).
--   2. A requester reply on a WAITING_FOR_USER ticket returns it to
--      IN_PROGRESS via the SECURITY DEFINER requester_provide_info() RPC.
--   3. Internal notes (is_internal) are sealed from requesters at the DB
--      layer — requesters can neither read nor author internal notes.
--   4. ticket_status_history inserts are staff/admin/manager-only so an
--      arbitrary authenticated user can no longer forge an audit trail.
--
-- Mirrors supabase/schema.sql. Run in the Supabase SQL Editor. This is
-- additive; it does not drop or alter existing tables/columns.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ticket_messages SELECT — hide internal notes from requesters.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view messages of accessible tickets"
  ON public.ticket_messages;

CREATE POLICY "Users can view messages of accessible tickets" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_messages.ticket_id
      AND (
        tickets.requester_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
        )
      )
    )
    AND (
      NOT ticket_messages.is_internal
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
      )
    )
  );

-- ---------------------------------------------------------------------
-- 2. ticket_messages INSERT — only staff may author internal notes.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create messages for accessible tickets"
  ON public.ticket_messages;

CREATE POLICY "Users can create messages for accessible tickets" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_messages.ticket_id
      AND (
        tickets.requester_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
        )
      )
    )
    AND (
      NOT ticket_messages.is_internal
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
      )
    )
  );

-- ---------------------------------------------------------------------
-- 3. ticket_status_history INSERT — staff/admin/manager only.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert ticket status history"
  ON public.ticket_status_history;
DROP POLICY IF EXISTS "Staff can insert ticket status history"
  ON public.ticket_status_history;

CREATE POLICY "Staff can insert ticket status history" ON public.ticket_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  );

-- ---------------------------------------------------------------------
-- 4. requester_provide_info(ticket_id) — the sanctioned requester status
--    transition (WAITING_FOR_USER -> IN_PROGRESS) with audited history.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.requester_provide_info(p_ticket_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current  public.ticket_status;
  v_requester UUID;
BEGIN
  SELECT status, requester_id
    INTO v_current, v_requester
    FROM public.tickets
   WHERE id = p_ticket_id
   FOR UPDATE;

  -- Only the ticket's own requester may trigger this path.
  IF v_requester IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Only a WAITING_FOR_USER ticket may be returned to IN_PROGRESS this way.
  IF v_current IS DISTINCT FROM 'waiting_for_user'::public.ticket_status THEN
    RETURN FALSE;
  END IF;

  UPDATE public.tickets
     SET status = 'in_progress'::public.ticket_status,
         updated_at = NOW()
   WHERE id = p_ticket_id;

  INSERT INTO public.ticket_status_history
    (ticket_id, old_status, new_status, changed_by, notes)
  VALUES
    (p_ticket_id, 'waiting_for_user', 'in_progress', auth.uid(),
     'Requester provided the requested information');

  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.requester_provide_info(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requester_provide_info(UUID) TO authenticated;

-- =====================================================================
-- VERIFICATION (run after applying):
--   1. Requester internal-note isolation:
--        SELECT polname, cmd, qual FROM pg_policies WHERE tablename='ticket_messages';
--      The SELECT policy must contain "NOT ticket_messages.is_internal".
--   2. History write restriction:
--        SELECT polname, cmd, qual FROM pg_policies WHERE tablename='ticket_status_history';
--      The INSERT policy must require an it_staff/admin/manager role, not "true".
--   3. requester_provide_info() guard (in SQL Editor as a requester):
--        - returns FALSE for a ticket you do not own;
--        - returns FALSE when the ticket is not WAITING_FOR_USER;
--        - returns TRUE and flips WAITING_FOR_USER -> IN_PROGRESS + history row
--          when you own the ticket and it is waiting on you.
-- =====================================================================
