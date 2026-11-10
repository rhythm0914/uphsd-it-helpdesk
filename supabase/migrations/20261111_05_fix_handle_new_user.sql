-- Phase 6 follow-up — fix public.handle_new_user().
--
-- Two defects in the baseline definition, both found by running the SQL:
--
--   1. It inserted a TEXT variable into profiles.role, which is an enum. Postgres
--      does not cast implicitly there, so every sign-up failed with
--      "column \"role\" is of type user_role but expression is of type text"
--      (42804) and the new auth user was rolled back.
--
--   2. It read the role from NEW.raw_user_meta_data. That value comes from the
--      client: anyone calling supabase.auth.signUp() directly could pass
--      {"role":"admin"} and be created as an administrator, regardless of what
--      the sign-up form offers.
--
-- The trigger now always creates a student. Employee and staff accounts are
-- granted by an administrator from /portal/admin/users, which is the only place
-- a role may be raised.
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student'::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$fn$;
