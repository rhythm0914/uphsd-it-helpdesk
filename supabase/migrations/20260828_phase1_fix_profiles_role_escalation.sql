-- =====================================================================
-- UPHSD IT Help Desk — Security Fix Phase 1 — Migration C1 (CRITICAL)
-- Prevent authenticated users from self-escalating their profile `role`.
--
-- ROOT CAUSE
--   public.profiles has a TABLE-LEVEL `UPDATE` grant for the PostgREST
--   `authenticated` role, AND a self-service RLS update policy:
--
--       CREATE POLICY "Users can update their own profile"
--         ON public.profiles FOR UPDATE USING (auth.uid() = id);
--
--   Every logged-in user connects as the SINGLE `authenticated` PostgREST
--   role. Once their row passes the policy (auth.uid() = id) there is no
--   further check on the NEW column values, so a user could issue:
--
--       UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
--
--   and RLS permitted it. The application derives all RBAC from
--   profiles.role (portal layout, IT queue, admin layout, every admin/queue
--   Server Action), so a user could escalate to it_staff/admin/manager and
--   reach every privileged surface (OWASP A01 Broken Access Control / IDOR).
--
-- FIX MODEL
--   1) REVOKE table-level UPDATE on profiles from `authenticated`.
--   2) Grant column-level UPDATE ONLY on the safe self-service columns,
--      so a user can manage full_name/department/student_number/
--      employee_id/phone/avatar_url but can NEVER write role, id, email,
--      created_at or updated_at via the REST/client path.
--   3) Add a SECURITY DEFINER helper (is_admin_or_manager) reflecting the
--      app's RBAC (admin OR manager) and use it for the admin SELECT policy
--      so a manager keeps the admin parity the app already grants.
--   4) Provide one SECURITY DEFINER function (admin_set_user_role) as the
--      sanctioned way to change a role (used by the admin UI). It rejects
--      non-admin/manager callers at the top, so cannot be used for
--      self-escalation.
--
-- SAFETY / NON-DESTRUCTIVE
--   * Idempotent & re-runnable.
--   * No table drops/resets, no RLS disable, no email-confirmation change,
--     no service-role key, no protected-route exposure.
--   * Preserves roles: student, employee, it_staff, admin, manager.
--   * Leaves tickets, ticket_messages, ticket_status_history, services,
--     ticket_categories and imports grants untouched.
--
-- APPLICATION: run this whole file in the Supabase SQL Editor (as a single
-- transaction) against the EXISTING production database.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Revoke table-level UPDATE on profiles for authenticated.
--    (SELECT and INSERT remain; there is NO DELETE policy so rows cannot be
--    deleted, and the auth.users trigger always creates the profile row, so
--    INSERT-based role changes cannot succeed either.)
-- ---------------------------------------------------------------------
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;

-- Grant UPDATE only on the columns a user may legitimately self-service.
GRANT UPDATE (
  full_name,
  department,
  student_number,
  employee_id,
  phone,
  avatar_url
) ON TABLE public.profiles TO authenticated;

-- The existing `updated_at` auto-trigger (BEFORE UPDATE) sets NEW.updated_at.
-- Under column-level UPDATE grants a BEFORE UPDATE trigger that writes a
-- column the role cannot update normally succeeds only if that write runs as
-- the object owner. Promote the shared trigger helper to SECURITY DEFINER
-- (with a pinned search_path) so profile self-service updates keep working
-- WITHOUT granting the `authenticated` role UPDATE on `updated_at`. This
-- preserves the invariant that clients can never directly write
-- created_at / updated_at / id / email / role.
ALTER FUNCTION public.update_updated_at_column()
  SECURITY DEFINER
  SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------
-- 2) SECURITY DEFINER helpers reflecting the app's RBAC (admin OR manager).
--    SECURITY DEFINER lets a profiles policy read the caller's own profile
--    without triggering RLS recursion. search_path is pinned to public +
--    pg_temp (pg_temp last) to avoid search-path hijacking.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

-- Keep the pre-existing admin-only helper, pinned search_path (idempotent).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Point the admin visibility policy at the RBAC-parity helper so a manager
-- keeps the "view all users" capability the admin already has.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_manager());

-- The existing self-update policy ("Users can update their own profile",
-- FOR UPDATE USING (auth.uid() = id)) is now SAFE and left in place:
-- because `authenticated` no longer holds UPDATE privilege on the protected
-- columns, any attempt to self-set `role` is refused at the privilege layer
-- BEFORE RLS is even consulted.

-- ---------------------------------------------------------------------
-- 3) Authorized role-change path (server-side only). The sanctioned way to
--    change a user's role. A caller who is not an existing admin/manager is
--    rejected BEFORE doing any work, so it cannot be used for self-escalation.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_user_id UUID,
  p_role     public.user_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role public.user_role;
BEGIN
  -- Hard gate: only an existing admin/manager may change a user role.
  SELECT p.role INTO actor_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF actor_role IS NULL OR actor_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Only administrators (admin/manager) can change user roles';
  END IF;

  UPDATE public.profiles
  SET role       = p_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, public.user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, public.user_role) TO authenticated;

COMMIT;

-- =====================================================================
-- VERIFICATION (run AFTER applying, in the SQL Editor)
--
-- 1) Confirm the protected columns are no longer updatable by `authenticated`:
--      SELECT column_name
--      FROM information_schema.column_privileges
--      WHERE table_schema = 'public'
--        AND table_name   = 'profiles'
--        AND grantee      = 'authenticated'
--        AND privilege_type = 'UPDATE'
--      ORDER BY column_name;
--    EXPECT ONE shape: avatar_url, department, employee_id, full_name, phone,
--    student_number only. role, id, email, created_at, updated_at MUST be absent.
--
-- 2) A normal user CANNOT self-escalate:
--      UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
--    EXPECT: ERROR - permission denied for table/column public.profiles.
--
-- 3) Self-service fields still work:
--      UPDATE public.profiles
--      SET full_name = 'New Name', department = 'Informatics'
--      WHERE id = auth.uid();
--    EXPECT: success (1 row) and updated_at bumped by the trigger.
--
-- 4) Ticket creation still works (grants/RLS untouched):
--      INSERT INTO public.tickets
--        (requester_id, service_id, category_id, subject, description)
--      VALUES (auth.uid(), '<service-uuid>', '<category-uuid>', 's', 'd');
--    EXPECT: success with RLS WITH CHECK (requester_id = auth.uid()).
--
-- 5) Sanctioned role path ONLY permits admin/manager:
--      -- as a student/employee:
--      SELECT public.admin_set_user_role(uid(), 'it_staff');
--        -> RAISES "Only administrators (admin/manager) can change user roles"
--      -- as an existing admin/manager, with a valid enum value:
--      SELECT public.admin_set_user_role('<target-user-id>', 'it_staff');
--        -> success (true).
-- =====================================================================