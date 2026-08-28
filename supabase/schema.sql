-- UPHSD IT Help Desk - Phase 3 Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles enum
CREATE TYPE public.user_role AS ENUM ('student', 'employee', 'it_staff', 'admin', 'manager');

-- Ticket status enum
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed');

-- Ticket priority enum
CREATE TYPE public.ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'student',
  department TEXT,
  student_number TEXT,
  employee_id TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket categories table
CREATE TABLE IF NOT EXISTS public.ticket_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  requester_id UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  service_id UUID REFERENCES public.services(id) NOT NULL,
  category_id UUID REFERENCES public.ticket_categories(id) NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  status public.ticket_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Ticket status history table
CREATE TABLE IF NOT EXISTS public.ticket_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  old_status public.ticket_status,
  new_status public.ticket_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_requester_id ON public.tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_status_history_ticket_id ON public.ticket_status_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Grant table access to PostgREST roles so RLS policies can be evaluated.
-- Without these grants PostgREST raises "permission denied for table", which
-- surfaces as loading errors in the app. Row-level security still controls
-- which rows each role can actually see.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- SECURITY DEFINER helper used to check admin status without triggering RLS
-- recursion (a policy on profiles that reads profiles recurses infinitely).
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

CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
-- =====================================================================
-- SECURITY FIX (C1): profiles UPDATE must be column-scoped so that no
-- authenticated user can self-escalate `role`. Mirrors the versioned
-- migration supabase/migrations/20260828_phase1_fix_profiles_role_escalation.sql
-- =====================================================================
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (
  full_name,
  department,
  student_number,
  employee_id,
  phone,
  avatar_url
) ON TABLE public.profiles TO authenticated;

-- RBAC-parity helper (admin OR manager), SECURITY DEFINER to avoid
-- recursion when read from a profiles policy. search_path is pinned.
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

-- Manager keeps the same admin visibility parity as the app grants.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_manager());

-- Authorized, server-side role-change path (admin/manager only).
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

-- RLS Policies for services (readable by all authenticated users)
CREATE POLICY "Services are readable by authenticated users" ON public.services
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for ticket categories (readable by all authenticated users)
CREATE POLICY "Ticket categories are readable by authenticated users" ON public.ticket_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for tickets
CREATE POLICY "Users can view their own tickets" ON public.tickets
  FOR SELECT USING (
    requester_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "IT staff and admins can update tickets" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  );

-- RLS Policies for ticket status history
CREATE POLICY "Users can view status history of accessible tickets" ON public.ticket_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_status_history.ticket_id
      AND (
        tickets.requester_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Staff can insert ticket status history" ON public.ticket_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  );

-- =====================================================================
-- Ticket workflow hardening (Phase 7.6b):
--  * Internal notes (is_internal = true) are visible ONLY to staff/admin/
--    manager. A requester may never read another role's internal notes, and
--    may never post a message flagged as internal (INSERT is constrained too).
--  * ticket_status_history inserts are staff/admin/manager-only so an
--    arbitrary authenticated user cannot forge an audit trail. The
--    requester-provides-info transition is the only non-staff status change
--    and goes through the SECURITY DEFINER requester_provide_info() RPC below.
-- Mirrored by the versioned migration
-- supabase/migrations/20260829_phase1_ticket_workflow_reply_and_rls.sql
-- =====================================================================
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

-- Sanctioned requester action: a requester who has provided the requested
-- information on a WAITING_FOR_USER ticket returns it to IN_PROGRESS and the
-- transition is recorded in history. SECURITY DEFINER + pinned search_path so
-- the (now staff-only) history insert policy is not bypassed by a normal user
-- outside this guarded path, and only the ticket's own requester may invoke it
-- while the ticket is actually waiting on them.
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

-- Insert default services
INSERT INTO public.services (name, description) VALUES
  ('University Email', 'Email access, configuration, and troubleshooting'),
  ('Microsoft 365', 'Office 365, OneDrive, and productivity tools'),
  ('Microsoft Teams', 'Teams collaboration, meetings, and access'),
  ('Canvas', 'Learning management system access and support'),
  ('Network / Wi-Fi', 'Campus network connectivity and Wi-Fi access'),
  ('Computer Support', 'Desktop, laptop, and device troubleshooting'),
  ('Printer Support', 'Printing issues and printer configuration'),
  ('Software Support', 'Software installation and application issues'),
  ('Account & Access', 'Account recovery, passwords, and access requests'),
  ('General IT Support', 'Other technology support requests')
ON CONFLICT (name) DO NOTHING;

-- Insert default ticket categories
INSERT INTO public.ticket_categories (name, description) VALUES
  ('Account & Password', 'Password resets, account recovery, and access issues'),
  ('Email', 'University email problems and configuration'),
  ('Microsoft 365 / Teams', 'Office 365, Teams, and productivity tools'),
  ('Canvas', 'Learning management system support'),
  ('Network / Wi-Fi', 'Connectivity and wireless network issues'),
  ('Hardware', 'Computer, laptop, and peripheral hardware'),
  ('Software', 'Software installation and application problems'),
  ('Printer', 'Printing and scanner support'),
  ('Access Request', 'Permission and access requests'),
  ('General IT Question', 'Other technology questions and support')
ON CONFLICT (name) DO NOTHING;

-- Service categories junction table
CREATE TABLE IF NOT EXISTS public.service_categories (
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.ticket_categories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (service_id, category_id)
);

-- Indexes for service categories
CREATE INDEX IF NOT EXISTS idx_service_categories_service_id ON public.service_categories(service_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_category_id ON public.service_categories(category_id);

-- Enable RLS on service categories
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Service categories are readable by all authenticated users
CREATE POLICY "Service categories are readable by authenticated users" ON public.service_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins and managers can manage service categories
CREATE POLICY "Admins can manage service categories" ON public.service_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Insert default service-category mappings
INSERT INTO public.service_categories (service_id, category_id)
SELECT s.id, c.id
FROM public.services s
JOIN public.ticket_categories c ON c.name IN (
  'Account & Password',
  'Email',
  'Microsoft 365 / Teams',
  'Canvas',
  'Network / Wi-Fi',
  'Hardware',
  'Software',
  'Printer',
  'Access Request',
  'General IT Question'
)
WHERE s.name IN (
  'University Email',
  'Microsoft 365',
  'Microsoft Teams',
  'Canvas',
  'Network / Wi-Fi',
  'Computer Support',
  'Printer Support',
  'Software Support',
  'Account & Access',
  'General IT Support'
)
ON CONFLICT (service_id, category_id) DO NOTHING;

-- Additional specific mappings
INSERT INTO public.service_categories (service_id, category_id)
SELECT s.id, c.id
FROM public.services s
CROSS JOIN public.ticket_categories c
WHERE
  (s.name = 'University Email' AND c.name IN ('Account & Password', 'Email'))
  OR (s.name = 'Microsoft 365' AND c.name = 'Microsoft 365 / Teams')
  OR (s.name = 'Microsoft Teams' AND c.name = 'Microsoft 365 / Teams')
  OR (s.name = 'Canvas' AND c.name = 'Canvas')
  OR (s.name = 'Network / Wi-Fi' AND c.name = 'Network / Wi-Fi')
  OR (s.name = 'Computer Support' AND c.name IN ('Hardware', 'Software'))
  OR (s.name = 'Printer Support' AND c.name = 'Printer')
  OR (s.name = 'Software Support' AND c.name = 'Software')
  OR (s.name = 'Account & Access' AND c.name IN ('Account & Password', 'Access Request'))
  OR (s.name = 'General IT Support' AND c.name = 'General IT Question')
ON CONFLICT (service_id, category_id) DO NOTHING;

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  seq INTEGER;
  ticket_num TEXT;
BEGIN
  year := EXTRACT(YEAR FROM NOW())::TEXT;
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 'IT-' || year || '-(\\d+)') AS INTEGER)), 0) + 1
  INTO seq
  FROM public.tickets
  WHERE ticket_number LIKE 'IT-' || year || '-%';
  
  ticket_num := 'IT-' || year || '-' || LPAD(seq::TEXT, 6, '0');
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Needed so column-level UPDATE grants on profiles don't break the
-- BEFORE UPDATE auto-timestamp trigger (SECURITY DEFINER lets the trigger
-- write updated_at as the owner while authenticated never gets the column).
ALTER FUNCTION public.update_updated_at_column()
  SECURITY DEFINER
  SET search_path = public, pg_temp;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_categories_updated_at
  BEFORE UPDATE ON public.ticket_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function to auto-create profile on auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', ''),
    'student'
  );

  IF v_role NOT IN ('student', 'employee', 'it_staff', 'admin', 'manager') THEN
    v_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.handle_new_user() SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Import audit table
CREATE TABLE IF NOT EXISTS public.imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  imported_by UUID REFERENCES public.profiles(id) NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  rejected_rows INTEGER NOT NULL DEFAULT 0,
  error_report TEXT,
  duplicate_report TEXT
);

-- Index for import audit lookups
CREATE INDEX IF NOT EXISTS idx_imports_imported_by ON public.imports(imported_by);
CREATE INDEX IF NOT EXISTS idx_imports_imported_at ON public.imports(imported_at);

-- Enable RLS on imports
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- Only admins and managers can view import audit records
CREATE POLICY "Admins can view import audit records" ON public.imports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- System can insert import audit records
CREATE POLICY "System can insert import audit records" ON public.imports
  FOR INSERT WITH CHECK (true);
