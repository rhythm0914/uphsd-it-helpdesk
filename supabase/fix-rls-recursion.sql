-- UPHSD IT Help Desk - RLS Recursion & Grants Fix
-- Run this in the Supabase SQL Editor (targeted migration, idempotent).
-- Fixes:
--   1) "permission denied for table" (42501) on public tables because the
--      anon/authenticated roles were not granted access. RLS still governs
--      which rows each role can see.
--   2) "infinite recursion detected in policy for relation profiles" caused by
--      the "Admins can view all profiles" policy reading public.profiles from
--      within a policy on public.profiles. Replaced with a SECURITY DEFINER
--      helper so admin checks never recurse.

-- 1. Grant PostgREST roles access to public tables (RLS still enforces rows).
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 2. SECURITY DEFINER helper to check admin status without RLS recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 3. Drop the recursive policy and recreate it non-recursively.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());