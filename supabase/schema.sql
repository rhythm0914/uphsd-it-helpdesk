-- UPHSD IT Help Desk — complete database schema for Supabase.
--
-- Apply this once to an empty Supabase project (SQL Editor → paste → Run). It
-- creates every type, table, index, policy, function and trigger the
-- application expects, in dependency order.
--
-- It is written to be safe to run twice: types, tables and indexes are guarded,
-- functions are CREATE OR REPLACE, and policies are dropped before being
-- created. Everything runs in one transaction, so a failure leaves nothing
-- half-applied.
--
-- Upgrading an existing project instead of creating one: run
-- supabase/upgrade/add_enum_values.sql on its own first, then this file. The
-- rest of the file is written to converge an older database (ADD COLUMN IF NOT
-- EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS).
--
-- Beside this file, and never run automatically:
--   supabase/upgrade/add_enum_values.sql        (existing databases only)
--   supabase/one-off/retire_legacy_tickets.sql  (retire pre-2026 tickets)
--   supabase/verify/alignment_checks.sql        (read-only invariants)
--
-- The runner that proves this file applies is `npm run verify:sql`, which
-- executes it against a real Postgres and then asserts the workflow rules.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fail fast, and readably, on a database that predates this schema.
-- Postgres cannot use an enum value in the transaction that adds it, so this
-- file can never both add the missing statuses and use them. The upgrade is
-- therefore one separate statement first: supabase/upgrade/add_enum_values.sql.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'ticket_status' AND e.enumlabel = 'reopened'
     )
  THEN
    RAISE EXCEPTION
      'This database predates the current schema. Run supabase/upgrade/add_enum_values.sql first, then run this file.';
  END IF;
END $$;

-- Roles enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('student', 'employee', 'it_staff', 'admin', 'manager');
  END IF;
END $$;

-- Ticket status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE public.ticket_status AS ENUM (
      'open', 'in_progress', 'waiting_for_user', 'resolved', 'reopened', 'rejected', 'closed'
    );
  END IF;
END $$;

-- Ticket priority enum
-- Paper requires: Urgent, High, Medium, Low. "medium" replaces "normal".
-- "normal" is kept in the enum for backward compatibility with existing data;
-- all new code writes "medium".
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
  -- Add "medium" to existing databases that already have the type without it.
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ticket_priority' AND e.enumlabel = 'medium'
  ) THEN
    ALTER TYPE public.ticket_priority ADD VALUE 'medium';
  END IF;
END $$;

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
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
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
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
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

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
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
DROP POLICY IF EXISTS "Services are readable by authenticated users" ON public.services;
CREATE POLICY "Services are readable by authenticated users" ON public.services
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for ticket categories (readable by all authenticated users)
DROP POLICY IF EXISTS "Ticket categories are readable by authenticated users" ON public.ticket_categories;
CREATE POLICY "Ticket categories are readable by authenticated users" ON public.ticket_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets" ON public.tickets
  FOR SELECT USING (
    requester_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
CREATE POLICY "Users can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "IT staff and admins can update tickets" ON public.tickets;
CREATE POLICY "IT staff and admins can update tickets" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  );

-- RLS Policies for ticket status history
DROP POLICY IF EXISTS "Users can view status history of accessible tickets" ON public.ticket_status_history;
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

DROP POLICY IF EXISTS "Staff can insert ticket status history" ON public.ticket_status_history;
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
DROP POLICY IF EXISTS "Users can view messages of accessible tickets" ON public.ticket_messages;
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

DROP POLICY IF EXISTS "Users can create messages for accessible tickets" ON public.ticket_messages;
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

-- ---------------------------------------------------------------------------
-- Published knowledge articles aligned with the current workflow.
-- These are the only source of official information the AI assistant may cite.
-- ---------------------------------------------------------------------------

INSERT INTO public.knowledge_articles (title, slug, content, keywords, is_published) VALUES
  (
    'How to submit an IT Help Desk request',
    'how-to-submit-request',
    'To submit a new IT request, go to the Help Desk portal, choose a service and category, describe the issue, and submit. You will receive a tracking ID (IT-YYYY-NNNNNN). If the issue is urgent (work or class is blocked right now), choose Urgent priority and explain what is blocked. Urgent requests are reviewed by a supervisor and alert on-call staff 24/7.',
    ARRAY['submit', 'request', 'tracking ID', 'urgent', 'service', 'category'],
    TRUE
  ),
  (
    'How to track your request',
    'how-to-track-request',
    'Sign in to the Help Desk portal and open Track, or pick the request from your recent submissions. Enter your Request ID to see its current status, the conversation history, and every status change. Tracking requires login so only you and the IT team can see your request.',
    ARRAY['track', 'tracking', 'status', 'request ID', 'sign in'],
    TRUE
  ),
  (
    'What happens when IT marks your request resolved',
    'resolved-verification',
    'When IT marks your request Resolved, you are asked to confirm the outcome. Choose "Fix works" to close it as Verified Fixed and leave a 1–5 satisfaction rating. Choose "Still broken" to reopen the request with the same ID. Only you (the requester) can close a request — IT staff cannot close it themselves. If you do not respond, you get one reminder after 3 days, and the request closes as No Response after 5 days. A No Response close is not counted as a fix.',
    ARRAY['resolved', 'verification', 'fix works', 'still broken', 'rating', 'no response', '3 days', '5 days'],
    TRUE
  ),
  (
    'Urgent requests (24/7 on-call)',
    'urgent-requests',
    'Choose Urgent priority when work, class, or an institutional deadline is blocked right now. You must state what is blocked. A supervisor reviews the request and can verify or downgrade the urgency. Verified urgent requests alert the Supervisor and on-call staff immediately, 24/7, and skip the business-hours wait. If the supervisor determines it is not genuine, it returns to the normal queue.',
    ARRAY['urgent', '24/7', 'on-call', 'supervisor', 'blocked', 'business hours'],
    TRUE
  ),
  (
    'Account recovery and password reset',
    'account-recovery',
    'If you cannot sign in, use the "Forgot your password?" link on the sign-in page. A recovery link is sent to your @perpetual.edu.ph email. The link is single-use and short-lived. If you have lost access to your UPHSD mailbox, contact IT staff in person for admin-assisted recovery — an admin will trigger a recovery for your verified account without ever seeing your password.',
    ARRAY['password', 'recovery', 'reset', 'sign in', 'email', 'admin-assisted'],
    TRUE
  ),
  (
    'How the Help Desk workflow works',
    'help-desk-workflow',
    'Every request follows the same workflow: Open → Assigned / In Progress → (optionally Awaiting Student) → Resolved → Closed. Only the requester can verify a fix and close a request. IT staff cannot close requests directly. If a ticket cannot be resolved, it is escalated to the IT Supervisor. Reopened tickets return to the same technician, who records the cause (wrong credentials, account lockout, account sync, or other) before resolving again.',
    ARRAY['workflow', 'statuses', 'open', 'assigned', 'resolved', 'closed', 'escalation', 'reopen'],
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;

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
DROP POLICY IF EXISTS "Service categories are readable by authenticated users" ON public.service_categories;
CREATE POLICY "Service categories are readable by authenticated users" ON public.service_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins and managers can manage service categories
DROP POLICY IF EXISTS "Admins can manage service categories" ON public.service_categories;
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

DROP TRIGGER IF EXISTS set_ticket_number_trigger ON public.tickets;
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

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_categories_updated_at ON public.ticket_categories;
CREATE TRIGGER update_ticket_categories_updated_at
  BEFORE UPDATE ON public.ticket_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function to auto-create profile on auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Public sign-up always creates a student. The role must never be read from
  -- raw_user_meta_data: that value is supplied by the client, so honouring it
  -- would let anyone register as an administrator. Staff roles are granted from
  -- /portal/admin/users.
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
DROP POLICY IF EXISTS "Admins can view import audit records" ON public.imports;
CREATE POLICY "Admins can view import audit records" ON public.imports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- System can insert import audit records
DROP POLICY IF EXISTS "System can insert import audit records" ON public.imports;
CREATE POLICY "System can insert import audit records" ON public.imports
  FOR INSERT WITH CHECK (true);

-- =====================================================================
-- PHASE 1 WORKFLOW (BPMN alignment) — applied by migrations
-- =====================================================================
-- This base schema file is the Phase 3 baseline. The incremental changes that
-- implement the BPMN ticket workflow are versioned migrations and MUST be
-- applied after this file, in this order:
--
--   migrations/20261110_01_add_ticket_status_values.sql
--     adds the `reopened` and `rejected` enum values to public.ticket_status.
--
--   migrations/20261110_02_phase1_ticket_state_machine.sql
--     adds closure_reason / rejection_reason / rejection_category /
--     reopened_count / resolved_at / awaiting_student_since, the
--     public.ticket_closure_reason enum, public.ticket_feedback, structured
--     audit columns (actor_role, reason), the single state-changing function
--     public.transition_ticket(), and revokes direct client writes on
--     tickets.status so the workflow cannot be bypassed.
--
-- Status identifiers are stored as: open, in_progress, waiting_for_user,
-- resolved, closed, reopened, rejected. Their user-facing BPMN labels are
-- defined once in utils/tickets/constants.ts ("Assigned / In Progress",
-- "Awaiting Student", etc.).
-- =====================================================================


-- ===========================================================================
-- 20260828_phase1_fix_profiles_role_escalation
-- ===========================================================================

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


-- ===========================================================================
-- 20260829_phase1_ticket_workflow_reply_and_rls
-- ===========================================================================

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

DROP POLICY IF EXISTS "Users can view messages of accessible tickets" ON public.ticket_messages;
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

DROP POLICY IF EXISTS "Users can create messages for accessible tickets" ON public.ticket_messages;
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

DROP POLICY IF EXISTS "Staff can insert ticket status history" ON public.ticket_status_history;
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


-- ===========================================================================
-- 20260829_phase2_fix_ticket_number_generation
-- ===========================================================================

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

DROP TRIGGER IF EXISTS set_ticket_number_trigger ON public.tickets;
CREATE TRIGGER set_ticket_number_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();

-- =====================================================================
--   SELECT public.next_ticket_number();           -- e.g. IT-2026-000002
--   SELECT public.next_ticket_number() = ...      -- call twice, same txn OK
--   INSERT a ticket as a requester via /portal/request and confirm a new
--   ticket_number is created without a 23505 error.
-- =====================================================================


-- ===========================================================================
-- 20260830_phase8_knowledge_base
-- ===========================================================================

-- =====================================================================
-- UPHSD IT Help Desk — Phase 8 — Knowledge Base for the AI Assistant
--
-- Creates public.knowledge_articles: a database-backed knowledge base
-- used as grounding context for the AI Assistant (/portal/assistant).
--
-- SECURITY MODEL (mirrors the existing RBAC + RLS conventions):
--   * RLS is ENABLED — never disabled.
--   * authenticated users can SELECT published articles only.
--   * admin/manager (via the existing is_admin_or_manager() SECURITY
--     DEFINER helper from migration 20260828) get full SELECT/INSERT/
--     UPDATE/DELETE so they can manage the knowledge base.
--   * student/employee/it_staff have NO write policies at all.
--   * anon (unauthenticated) gets NO policies — cannot read anything.
--
-- SAFETY / NON-DESTRUCTIVE
--   * Idempotent & re-runnable (IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS).
--   * No drops of existing tables, no data changes, no RLS changes on
--     existing tables. Purely additive.
--
-- EXISTING database (same flow as the previous phase migrations).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.ticket_categories(id) ON DELETE SET NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_published
  ON public.knowledge_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_service_id
  ON public.knowledge_articles(service_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category_id
  ON public.knowledge_articles(category_id);

-- Keep updated_at fresh, using the shared trigger helper that already
-- exists on profiles/services/tickets (update_updated_at_column).
DROP TRIGGER IF EXISTS trg_knowledge_articles_updated_at ON public.knowledge_articles;
DROP TRIGGER IF EXISTS trg_knowledge_articles_updated_at ON public.knowledge_articles;
CREATE TRIGGER trg_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2) RLS + grants (readable published rows for authenticated users;
--    full management for admin/manager only)
-- ---------------------------------------------------------------------
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

-- The rest of the schema grants table privileges explicitly per table;
-- follow the same pattern rather than relying on ALL-TABLES grants.
GRANT SELECT ON public.knowledge_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_articles TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read published knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Authenticated users can read published knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Authenticated users can read published knowledge articles" ON public.knowledge_articles
  FOR SELECT
  TO authenticated
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "Admin/manager can read all knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Admin/manager can read all knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/manager can read all knowledge articles" ON public.knowledge_articles
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin/manager can create knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Admin/manager can create knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/manager can create knowledge articles" ON public.knowledge_articles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin/manager can update knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Admin/manager can update knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/manager can update knowledge articles" ON public.knowledge_articles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin/manager can delete knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Admin/manager can delete knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/manager can delete knowledge articles" ON public.knowledge_articles
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

COMMIT;

-- =====================================================================
--
-- 1) As an authenticated student/employee:
--      SELECT * FROM public.knowledge_articles WHERE is_published = FALSE;
--    EXPECT: zero rows (RLS filters unpublished articles out).
--
-- 2) As an authenticated student/employee:
--      INSERT INTO public.knowledge_articles (title, slug, content)
--      VALUES ('x', 'x', 'x');
--    EXPECT: failure — new row violates row-level security policy.
--
-- 3) As an admin/manager: insert/update/publish/delete succeed.
--
-- 4) Existing behavior untouched: tickets, messages, history, profiles.
-- =====================================================================


-- ===========================================================================
-- 20260831_phase9_asset_management
-- ===========================================================================

-- Phase 9: Office Computer & IT Equipment Asset Management
-- Reproduces the client's Excel inventory ("Office Computer Inventory")
-- exactly, EXCEPT the two explicitly removed fields: "Installed Sangfor"
-- and "PMS". Movement history is a separate table (never an inventory
-- column). Additive + idempotent; no existing tables are modified.

-- 16 inventory columns (Excel terminology preserved in the UI):
--   re, ict_asset, manufacturer, model, serial_number, specification,
--   asset_number, date_acquired, accountable_personnel, accountable_position,
--   condition, department_office, bldg, remarks, domain_name, computer_name
create table if not exists public.ict_assets (
  id uuid primary key default gen_random_uuid(),
  re text,
  ict_asset text not null,
  manufacturer text,
  model text,
  serial_number text,
  specification text,
  asset_number text,
  date_acquired date,
  accountable_personnel text,
  accountable_position text,
  condition text,
  department_office text,
  bldg text,
  remarks text,
  domain_name text,
  computer_name text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent accidental duplicate equipment records (nullable fields may repeat
-- only when empty).
create unique index if not exists ict_assets_asset_number_key
  on public.ict_assets (lower(asset_number))
  where asset_number is not null and asset_number <> '';

create unique index if not exists ict_assets_serial_number_key
  on public.ict_assets (lower(serial_number))
  where serial_number is not null and serial_number <> '';

create index if not exists ict_assets_department_idx
  on public.ict_assets (department_office);
create index if not exists ict_assets_condition_idx
  on public.ict_assets (condition);

-- Separate movement/history table. The current ict_assets row is the CURRENT
-- state; every transfer appends here. History is never overwritten.
create table if not exists public.asset_movements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.ict_assets (id) on delete cascade,
  previous_accountable_personnel text,
  new_accountable_personnel text,
  previous_accountable_position text,
  new_accountable_position text,
  previous_department_office text,
  new_department_office text,
  previous_bldg text,
  new_bldg text,
  remarks text,
  performed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists asset_movements_asset_idx
  on public.asset_movements (asset_id, created_at desc);

alter table public.ict_assets enable row level security;
alter table public.asset_movements enable row level security;

-- Explicit table-level grants. RLS governs row access; without these the
-- authenticated role has no privileges on the tables at all and every query
-- fails with "permission denied for table" (see the Phase 8 knowledge-base
-- migration for the same pattern).
GRANT SELECT ON public.ict_assets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ict_assets TO authenticated;
GRANT SELECT ON public.asset_movements TO authenticated;
GRANT INSERT ON public.asset_movements TO authenticated;

-- Staff (it_staff/admin/manager) may view the inventory and its history.
drop policy if exists "Staff can view ICT assets" on public.ict_assets;
create policy "Staff can view ICT assets"
  on public.ict_assets for select
  using (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('it_staff', 'admin', 'manager')
    )
  );

drop policy if exists "Admin/manager can manage ICT assets" on public.ict_assets;
create policy "Admin/manager can manage ICT assets"
  on public.ict_assets for all
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "Staff can view asset movements" on public.asset_movements;
create policy "Staff can view asset movements"
  on public.asset_movements for select
  using (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('it_staff', 'admin', 'manager')
    )
  );

-- Movement inserts ride on the asset-update policy via SECURITY DEFINER
-- server actions; no direct client inserts (history must not be editable).
drop policy if exists "Admin/manager can insert asset movements" on public.asset_movements;
create policy "Admin/manager can insert asset movements"
  on public.asset_movements for insert
  with check (public.is_admin_or_manager());

do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at_column') then
    execute 'drop trigger if exists set_ict_assets_updated_at on public.ict_assets';
    execute 'create trigger set_ict_assets_updated_at before update on public.ict_assets
      for each row execute function update_updated_at_column()';
  end if;
end
$$;


-- ===========================================================================
-- 20261110_02_phase1_ticket_state_machine
-- ===========================================================================

-- Phase 1 (step 2 of 2) — status model, single transition function, audit trail.
--
--
-- What this does
--   1. Adds the ticket workflow columns the BPMN process needs.
--   2. Adds structured audit columns (actor role + reason) to status history.
--   3. Adds the satisfaction rating store written only by the transition function.
--   4. Migrates legacy `closed` tickets to `resolved` (there is no requester
--      confirmation artefact anywhere, so claiming "Verified Fixed" would be a lie).
--   5. Creates public.transition_ticket() — the ONE place a status may change.
--   6. Removes the ability to write tickets.status / closure columns directly, so
--      the transition function cannot be bypassed through PostgREST.
--
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------------------
-- 1. Workflow columns
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_closure_reason') THEN
    CREATE TYPE public.ticket_closure_reason AS ENUM ('verified_fixed', 'no_response', 'rejected', 'cancelled_by_requester');
  END IF;
  -- Add 'rejected' and 'cancelled_by_requester' to existing databases.
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ticket_closure_reason' AND e.enumlabel = 'rejected'
  ) THEN
    ALTER TYPE public.ticket_closure_reason ADD VALUE 'rejected';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ticket_closure_reason' AND e.enumlabel = 'cancelled_by_requester'
  ) THEN
    ALTER TYPE public.ticket_closure_reason ADD VALUE 'cancelled_by_requester';
  END IF;
END $$;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closure_reason public.ticket_closure_reason;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS rejection_category TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS reopened_count INTEGER NOT NULL DEFAULT 0;
-- Cause the technician recorded when reworking a reopened ticket (wrong
-- credentials, account lockout, account sync, other + note).
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS reopen_cause TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS reopen_cause_note TEXT;
-- When the first staff reply was sent (for first-response-time KPI).
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS awaiting_student_since TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tickets_status_created_at ON public.tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_closure_reason ON public.tickets(closure_reason);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON public.tickets(resolved_at);

-- ---------------------------------------------------------------------------
-- 1b. Derived closure_type: satisfies the paper's data model (Verified fixed /
--     No response / Rejected) without changing Rejected from its own status.
--     Maps status + closure_reason to a single closure_type for reports and
--     exports. Non-terminal statuses return NULL.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ticket_closure_type(
  p_status public.ticket_status,
  p_closure_reason public.ticket_closure_reason
) RETURNS public.ticket_closure_reason
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status = 'closed' THEN p_closure_reason
    WHEN p_status = 'rejected' THEN 'rejected'::public.ticket_closure_reason
    ELSE NULL::public.ticket_closure_reason
  END;
$$;

-- Read-only view: one row per ticket with its derived closure_type.
CREATE OR REPLACE VIEW public.ticket_closure_types AS
  SELECT
    id,
    ticket_number,
    status,
    closure_reason,
    public.ticket_closure_type(status, closure_reason) AS closure_type
  FROM public.tickets;

ALTER VIEW public.ticket_closure_types OWNER TO postgres;

GRANT SELECT ON public.ticket_closure_types TO authenticated;
GRANT SELECT ON public.ticket_closure_types TO anon;

-- ---------------------------------------------------------------------------
-- 2. Audit trail: actor role + structured reason
-- ---------------------------------------------------------------------------

ALTER TABLE public.ticket_status_history ADD COLUMN IF NOT EXISTS actor_role public.user_role;
ALTER TABLE public.ticket_status_history ADD COLUMN IF NOT EXISTS reason TEXT;

-- ---------------------------------------------------------------------------
-- 3. Satisfaction rating (part of the "Fix works" transition)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ticket_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL UNIQUE REFERENCES public.tickets(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_feedback ENABLE ROW LEVEL SECURITY;

-- Read-only for clients. Writes happen exclusively inside transition_ticket(),
-- which is SECURITY DEFINER, so there is deliberately no INSERT/UPDATE policy.
DROP POLICY IF EXISTS "Feedback is visible to the requester and staff" ON public.ticket_feedback;
DROP POLICY IF EXISTS "Feedback is visible to the requester and staff" ON public.ticket_feedback;
CREATE POLICY "Feedback is visible to the requester and staff" ON public.ticket_feedback
  FOR SELECT USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('it_staff', 'admin', 'manager')
    )
  );

GRANT SELECT ON public.ticket_feedback TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Backfill: legacy `closed` -> `resolved`
--
-- Staff used to close tickets directly. No requester confirmation exists for
-- those rows, so the honest mapping is Resolved (pending verification), not
-- Closed (Verified Fixed). The audit row records why, and resolved_at keeps the
-- original closed_at so reporting does not lose the timestamp.
-- ---------------------------------------------------------------------------

INSERT INTO public.ticket_status_history
  (ticket_id, old_status, new_status, changed_by, notes, actor_role, reason)
SELECT
  t.id,
  'closed',
  'resolved',
  NULL,
  'Migrated: this ticket was closed by staff under the previous workflow, so no requester verification exists.',
  NULL,
  'Legacy staff-closed ticket migrated to Resolved'
FROM public.tickets t
WHERE t.status = 'closed' AND t.closure_reason IS NULL;

UPDATE public.tickets t
SET status = 'resolved',
    resolved_at = COALESCE(t.resolved_at, t.closed_at, t.updated_at),
    closed_at = NULL
WHERE t.status = 'closed' AND t.closure_reason IS NULL;

-- ---------------------------------------------------------------------------
-- 5. The one transition function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.transition_ticket(
  p_ticket_id UUID,
  p_action    TEXT,
  p_payload   JSONB DEFAULT '{}'::JSONB
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_actor        UUID := auth.uid();
  v_jwt_role     TEXT := auth.role();
  v_role         public.user_role;
  v_is_staff     BOOLEAN := FALSE;
  v_is_requester BOOLEAN := FALSE;
  v_is_system    BOOLEAN := (auth.role() = 'service_role');
  v_ticket       public.tickets;
  v_old_status   public.ticket_status;
  v_old_priority public.ticket_priority;
  v_target       public.ticket_status;
  v_closure      public.ticket_closure_reason;
  v_assignee     UUID;
  v_priority     public.ticket_priority;
  v_message      TEXT;
  v_reason       TEXT;
  v_reopen_cause TEXT;
  v_reopen_cause_note TEXT;
  v_note         TEXT;
  v_rating       SMALLINT;
  v_comment      TEXT;
  v_audit_note   TEXT;
BEGIN
  IF v_actor IS NULL AND NOT v_is_system THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_actor;
    v_is_staff := v_role IN ('it_staff', 'admin', 'manager');
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  v_is_requester := v_actor IS NOT NULL AND v_ticket.requester_id = v_actor;

  -- Never reveal that a ticket exists to someone who cannot see it: report the
  -- same error as a missing id.
  IF NOT v_is_staff AND NOT v_is_requester AND NOT v_is_system THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  v_old_status := v_ticket.status;
  v_old_priority := v_ticket.priority;
  v_message := NULLIF(btrim(COALESCE(p_payload->>'message', '')), '');
  v_reason  := NULLIF(btrim(COALESCE(p_payload->>'reason', '')), '');
  v_reopen_cause := NULLIF(btrim(COALESCE(p_payload->>'reopen_cause', '')), '');
  v_reopen_cause_note := NULLIF(btrim(COALESCE(p_payload->>'reopen_cause_note', '')), '');
  v_note    := NULLIF(btrim(COALESCE(p_payload->>'resolution_note', '')), '');
  v_comment := NULLIF(btrim(COALESCE(p_payload->>'comment', '')), '');

  CASE p_action
    WHEN 'assign' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can assign tickets' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'reopened') THEN
        RAISE EXCEPTION 'Cannot assign a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      BEGIN
        v_assignee := NULLIF(btrim(COALESCE(p_payload->>'assigned_to', '')), '')::UUID;
      EXCEPTION WHEN others THEN
        v_assignee := NULL;
      END;
      IF v_assignee IS NULL THEN
        RAISE EXCEPTION 'Select a technician to assign this request to.' USING ERRCODE = '22023';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = v_assignee AND p.role IN ('it_staff', 'admin', 'manager')
      ) THEN
        RAISE EXCEPTION 'Assignee must be an IT staff member' USING ERRCODE = '22023';
      END IF;
      IF p_payload ? 'priority' THEN
        BEGIN
          v_priority := (p_payload->>'priority')::public.ticket_priority;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'Invalid priority value' USING ERRCODE = '22023';
        END;
      END IF;
      v_target := 'in_progress'::public.ticket_status;
      v_audit_note := 'Assigned to technician';

    WHEN 'start_work' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can start work on a ticket' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'reopened') THEN
        RAISE EXCEPTION 'Cannot start work on a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      v_target := 'in_progress'::public.ticket_status;
      v_audit_note := 'Work started';

    WHEN 'acknowledge_reopen' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can acknowledge a reopened ticket' USING ERRCODE = '42501';
      END IF;
      IF v_old_status <> 'reopened' THEN
        RAISE EXCEPTION 'Only a reopened ticket can be acknowledged' USING ERRCODE = '22023';
      END IF;
      IF v_reopen_cause IS NULL THEN
        RAISE EXCEPTION 'Please record the cause of the reopen before acknowledging.' USING ERRCODE = '22023';
      END IF;
      v_target := 'in_progress'::public.ticket_status;
      v_audit_note := 'Reopened ticket acknowledged (cause: ' || v_reopen_cause || ')';

    WHEN 'request_info' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can request more information' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'reopened') THEN
        RAISE EXCEPTION 'Cannot request information on a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      IF v_message IS NULL THEN
        RAISE EXCEPTION 'Describe the information you need from the requester.' USING ERRCODE = '22023';
      END IF;
      v_target := 'waiting_for_user'::public.ticket_status;
      v_audit_note := 'Additional information requested from requester';

    WHEN 'student_reply' THEN
      IF NOT v_is_requester THEN
        RAISE EXCEPTION 'Only the requester can reply to an information request' USING ERRCODE = '42501';
      END IF;
      IF v_old_status <> 'waiting_for_user' THEN
        RAISE EXCEPTION 'This ticket is not waiting for the requester' USING ERRCODE = '22023';
      END IF;
      -- The message is required by the app; the SQL keeps it optional so the
      -- deprecated requester_provide_info() wrapper (no message arg) keeps
      -- working for any already-loaded client.
      v_target := CASE
        WHEN v_ticket.assigned_to IS NULL THEN 'open'::public.ticket_status
        ELSE 'in_progress'::public.ticket_status
      END;
      v_audit_note := 'Requester provided the requested information';

    WHEN 'resolve' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can mark a ticket resolved' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'reopened') THEN
        RAISE EXCEPTION 'Cannot resolve a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      IF v_note IS NULL THEN
        RAISE EXCEPTION 'A short resolution note is required.' USING ERRCODE = '22023';
      END IF;
      v_target := 'resolved'::public.ticket_status;
      v_audit_note := v_note;

    WHEN 'reject' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can reject a ticket' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'waiting_for_user', 'reopened') THEN
        RAISE EXCEPTION 'Cannot reject a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      IF v_reason IS NULL THEN
        RAISE EXCEPTION 'A rejection reason is required.' USING ERRCODE = '22023';
      END IF;
      v_target := 'rejected'::public.ticket_status;
      v_audit_note := v_reason;

    WHEN 'verify_fixed' THEN
      IF NOT v_is_requester THEN
        RAISE EXCEPTION 'Only the requester can confirm the fix' USING ERRCODE = '42501';
      END IF;
      IF v_old_status <> 'resolved' THEN
        RAISE EXCEPTION 'Only a resolved ticket can be verified' USING ERRCODE = '22023';
      END IF;
      BEGIN
        v_rating := (p_payload->>'rating')::SMALLINT;
      EXCEPTION WHEN others THEN
        v_rating := NULL;
      END;
      IF v_rating IS NULL OR v_rating < 1 OR v_rating > 5 THEN
        RAISE EXCEPTION 'A satisfaction rating from 1 to 5 is required.' USING ERRCODE = '22023';
      END IF;
      v_target := 'closed'::public.ticket_status;
      v_closure := 'verified_fixed'::public.ticket_closure_reason;
      v_audit_note := 'Requester confirmed the fix (Verified Fixed)';

    WHEN 'report_still_broken' THEN
      IF NOT v_is_requester THEN
        RAISE EXCEPTION 'Only the requester can reopen this ticket' USING ERRCODE = '42501';
      END IF;
      IF v_old_status <> 'resolved' THEN
        RAISE EXCEPTION 'Only a resolved ticket can be reopened' USING ERRCODE = '22023';
      END IF;
      IF v_reason IS NULL THEN
        RAISE EXCEPTION 'Please describe what is still broken.' USING ERRCODE = '22023';
      END IF;
      v_target := 'reopened'::public.ticket_status;
      v_audit_note := v_reason;

    WHEN 'close_no_response' THEN
      IF NOT v_is_system THEN
        RAISE EXCEPTION 'Only the automated no-response job can close a ticket this way' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('resolved', 'waiting_for_user') THEN
        RAISE EXCEPTION 'Cannot auto-close a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      v_target := 'closed'::public.ticket_status;
      v_closure := 'no_response'::public.ticket_closure_reason;
      v_audit_note := 'Closed automatically: no response from the requester';

    WHEN 'verify_urgent' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can verify urgency' USING ERRCODE = '42501';
      END IF;
      IF v_old_priority <> 'urgent'::public.ticket_priority THEN
        RAISE EXCEPTION 'Only an urgent ticket can be verified' USING ERRCODE = '22023';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'waiting_for_user', 'reopened') THEN
        RAISE EXCEPTION 'Cannot verify urgency on a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      v_target := v_old_status;
      v_audit_note := 'Urgency verified by supervisor';

    WHEN 'downgrade_urgent' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can downgrade urgency' USING ERRCODE = '42501';
      END IF;
      IF v_old_priority <> 'urgent'::public.ticket_priority THEN
        RAISE EXCEPTION 'Only an urgent ticket can be downgraded' USING ERRCODE = '22023';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'waiting_for_user', 'reopened') THEN
        RAISE EXCEPTION 'Cannot downgrade urgency on a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      v_priority := 'medium'::public.ticket_priority;
      v_target := v_old_status;
      v_audit_note := 'Urgency downgraded: returned to the normal queue';

    WHEN 'escalate' THEN
      IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Only IT staff can escalate a ticket' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'in_progress', 'waiting_for_user', 'reopened') THEN
        RAISE EXCEPTION 'Cannot escalate a ticket in status "%"', v_old_status USING ERRCODE = '22023';
      END IF;
      IF v_reason IS NULL THEN
        RAISE EXCEPTION 'An escalation reason is required.' USING ERRCODE = '22023';
      END IF;
      v_target := v_old_status;
      v_audit_note := 'Escalated to supervisor: ' || v_reason;

    WHEN 'cancel' THEN
      IF NOT v_is_requester THEN
        RAISE EXCEPTION 'Only the requester can cancel a request' USING ERRCODE = '42501';
      END IF;
      IF v_old_status NOT IN ('open', 'waiting_for_user') THEN
        RAISE EXCEPTION 'Only Open or Awaiting Student requests can be cancelled' USING ERRCODE = '22023';
      END IF;
      v_target := 'closed'::public.ticket_status;
      v_closure := 'cancelled_by_requester'::public.ticket_closure_reason;
      v_audit_note := 'Cancelled by requester';

    ELSE
      RAISE EXCEPTION 'Unknown ticket action "%"', p_action USING ERRCODE = '22023';
  END CASE;

  -- Requester-visible conversation entries created by the transition itself, so
  -- the reason a ticket moved is always readable in one transaction.
  IF p_action IN ('request_info', 'student_reply') AND v_message IS NOT NULL THEN
    INSERT INTO public.ticket_messages (ticket_id, sender_id, message, is_internal)
    VALUES (p_ticket_id, v_actor, v_message, FALSE);
  ELSIF p_action = 'reject' THEN
    INSERT INTO public.ticket_messages (ticket_id, sender_id, message, is_internal)
    VALUES (p_ticket_id, v_actor, 'This request was rejected: ' || v_reason, FALSE);
  ELSIF p_action = 'report_still_broken' THEN
    INSERT INTO public.ticket_messages (ticket_id, sender_id, message, is_internal)
    VALUES (p_ticket_id, v_actor, 'The issue is still broken: ' || v_reason, FALSE);
  END IF;

  UPDATE public.tickets t
  SET status = v_target,
      assigned_to = CASE WHEN p_action = 'assign' THEN v_assignee ELSE t.assigned_to END,
      priority = CASE
        WHEN p_action = 'downgrade_urgent' THEN 'medium'::public.ticket_priority
        WHEN p_action = 'assign' AND v_priority IS NOT NULL THEN v_priority
        ELSE t.priority
      END,
      urgent_verified_at = CASE
        WHEN p_action = 'verify_urgent' THEN now()
        ELSE t.urgent_verified_at
      END,
      urgent_verified_by = CASE
        WHEN p_action = 'verify_urgent' THEN v_actor
        ELSE t.urgent_verified_by
      END,
      resolved_at = CASE WHEN v_target = 'resolved' THEN now() ELSE t.resolved_at END,
      closed_at = CASE WHEN v_target = 'closed' THEN now() ELSE NULL END,
      closure_reason = v_closure,
      rejection_reason = CASE WHEN p_action = 'reject' THEN v_reason ELSE t.rejection_reason END,
      rejection_category = CASE
        WHEN p_action = 'reject'
          THEN NULLIF(btrim(COALESCE(p_payload->>'rejection_category', '')), '')
        ELSE t.rejection_category
      END,
      reopened_count = CASE
        WHEN p_action = 'report_still_broken' THEN t.reopened_count + 1
        ELSE t.reopened_count
      END,
      escalation_level = CASE
        WHEN p_action = 'escalate' THEN t.escalation_level + 1
        ELSE t.escalation_level
      END,
      escalated_at = CASE
        WHEN p_action = 'escalate' THEN now()
        ELSE t.escalated_at
      END,
      reopen_cause = CASE
        WHEN p_action = 'acknowledge_reopen' THEN v_reopen_cause
        ELSE t.reopen_cause
      END,
      reopen_cause_note = CASE
        WHEN p_action = 'acknowledge_reopen' THEN v_reopen_cause_note
        ELSE t.reopen_cause_note
      END,
      awaiting_student_since = CASE
        WHEN v_target = 'waiting_for_user' THEN now()
        ELSE NULL
      END,
      updated_at = now()
  WHERE t.id = p_ticket_id
  RETURNING * INTO v_ticket;

  INSERT INTO public.ticket_status_history
    (ticket_id, old_status, new_status, changed_by, notes, actor_role, reason)
  VALUES
    (p_ticket_id, v_old_status, v_target, v_actor, v_audit_note, v_role, v_reason);

  IF p_action = 'verify_fixed' THEN
    INSERT INTO public.ticket_feedback (ticket_id, requester_id, rating, comment)
    VALUES (p_ticket_id, v_ticket.requester_id, v_rating, v_comment)
    ON CONFLICT (ticket_id) DO UPDATE
      SET rating = EXCLUDED.rating, comment = EXCLUDED.comment;
  END IF;

  RETURN v_ticket;
END;
$fn$;

REVOKE ALL ON FUNCTION public.transition_ticket(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_ticket(UUID, TEXT, JSONB) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Deprecated alias: keep already-loaded clients working. It delegates to the
--    single transition function; it never writes status itself.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.requester_provide_info(p_ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  PERFORM public.transition_ticket(p_ticket_id, 'student_reply', '{}'::JSONB);
  RETURN TRUE;
END;
$fn$;

REVOKE ALL ON FUNCTION public.requester_provide_info(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requester_provide_info(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Close the bypass: clients may no longer write state columns directly.
--    Status, closure_reason, rejection_*, resolved_at, closed_at,
--    reopened_count and awaiting_student_since are written ONLY by
--    transition_ticket(). Everything else staff legitimately edit stays open.
-- ---------------------------------------------------------------------------

REVOKE UPDATE ON TABLE public.tickets FROM authenticated;
GRANT UPDATE (
  subject,
  description,
  priority,
  assigned_to,
  service_id,
  category_id,
  updated_at
) ON TABLE public.tickets TO authenticated;

DROP POLICY IF EXISTS "IT staff and admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "IT staff and admins can update tickets" ON public.tickets;
CREATE POLICY "IT staff and admins can update tickets" ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('it_staff', 'admin', 'manager')
    )
  );


-- ===========================================================================
-- 20261111_01_phase2_notifications_and_cycles
-- ===========================================================================

-- Phase 2 — notifications, work cycles, and SLA clock restart.
--
--
-- What this does
--   1. public.notifications: one in-app inbox row per recipient.
--   2. tickets.sla_started_at + tickets.current_cycle: the clock that restarts
--      when a requester reopens a ticket (Phase 5 derives due dates from it).
--   3. public.ticket_cycles: durable per-cycle history, so a reopened ticket
--      keeps the record of every prior attempt.
--   4. A trigger on ticket_status_history that maintains both, so NO transition
--      path can move a ticket without notifying and without recording the cycle.
--      It fires inside the same transaction as the transition, which is what
--      makes "atomic" true.
--
-- Email is NOT sent: this project has no email provider configured. All
-- notifications are in-app. See docs/CHANGELOG_ALIGNMENT.md.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Notifications
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM (
      'ticket_resolved',
      'ticket_verified',
      'ticket_reopened',
      'ticket_info_requested',
      'ticket_reply',
      'ticket_rejected',
      'ticket_assigned',
      'ticket_reminder',
      'ticket_escalated',
      'ticket_urgent_verified',
      'ticket_urgent_downgraded'
    );
  END IF;
  -- Add urgent notification types to existing databases.
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'ticket_urgent_verified'
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'ticket_urgent_verified';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'ticket_urgent_downgraded'
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'ticket_urgent_downgraded';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark their own notifications read" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark their own notifications read" ON public.notifications;
CREATE POLICY "Users can mark their own notifications read" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Staff may create in-app notifications (e.g. urgent verification/downgrade,
-- escalation alerts). The trigger still creates most notifications; this policy
-- covers staff-initiated ones that the trigger does not handle.
CREATE POLICY "Staff can create notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('it_staff', 'admin', 'manager')
    )
  );

-- Clients may read their inbox and set read_at. Nothing else.
REVOKE ALL ON TABLE public.notifications FROM authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.notifications TO authenticated;
GRANT INSERT (user_id, ticket_id, type, title, body) ON TABLE public.notifications TO authenticated;

-- Notification delivery log: one row per channel attempt per notification.
-- Email delivery is attempted outside the transaction that writes the ticket,
-- so a failed email never blocks a status change. in_app rows are written by
-- the transition trigger inside the same transaction.
CREATE TABLE IF NOT EXISTS public.notification_delivery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_notification
  ON public.notification_delivery(notification_id, channel);

ALTER TABLE public.notification_delivery ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.notification_delivery TO authenticated;

-- Delivery records are visible to the notification's recipient only.
DROP POLICY IF EXISTS "Users can view delivery records for their notifications" ON public.notification_delivery;
CREATE POLICY "Users can view delivery records for their notifications" ON public.notification_delivery
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_delivery.notification_id
        AND n.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. SLA clock + cycle counter
-- ---------------------------------------------------------------------------

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS current_cycle INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_started_at TIMESTAMPTZ;

UPDATE public.tickets
SET sla_started_at = created_at
WHERE sla_started_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Work cycles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ticket_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_ticket_cycles_ticket
  ON public.ticket_cycles(ticket_id, cycle_number);

ALTER TABLE public.ticket_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cycles are visible with the ticket" ON public.ticket_cycles;
DROP POLICY IF EXISTS "Cycles are visible with the ticket" ON public.ticket_cycles;
CREATE POLICY "Cycles are visible with the ticket" ON public.ticket_cycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_cycles.ticket_id
        AND (
          t.requester_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('it_staff', 'admin', 'manager')
          )
        )
    )
  );

REVOKE ALL ON TABLE public.ticket_cycles FROM authenticated;
GRANT SELECT ON TABLE public.ticket_cycles TO authenticated;

-- Backfill one cycle row for every existing ticket so the history renders.
INSERT INTO public.ticket_cycles
  (ticket_id, cycle_number, started_at, resolved_at, ended_at, outcome)
SELECT
  t.id,
  1,
  COALESCE(t.sla_started_at, t.created_at),
  t.resolved_at,
  t.closed_at,
  CASE t.status::TEXT
    WHEN 'closed' THEN COALESCE(t.closure_reason::TEXT, 'closed')
    WHEN 'rejected' THEN 'rejected'
    WHEN 'resolved' THEN 'resolved'
    ELSE 'open'
  END
FROM public.tickets t
ON CONFLICT (ticket_id, cycle_number) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Transition side effects: cycles + notifications
-- ---------------------------------------------------------------------------

-- Escalation recipients while there is no dedicated Supervisor role (Phase 5
-- adds it). Admin/manager are the operational escalation point today.
CREATE OR REPLACE FUNCTION public.admin_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT COALESCE(array_agg(p.id), ARRAY[]::UUID[])
  FROM public.profiles p
  WHERE p.role IN ('admin', 'manager');
$fn$;

REVOKE ALL ON FUNCTION public.admin_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_ids() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.on_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  t            public.tickets;
  v_recipients UUID[] := ARRAY[]::UUID[];
  v_type       public.notification_type;
  v_title      TEXT;
  v_body       TEXT;
  v_outcome    TEXT;
BEGIN
  SELECT * INTO t FROM public.tickets WHERE id = NEW.ticket_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- ---------------- work cycles ----------------
  IF NEW.new_status = 'resolved' THEN
    INSERT INTO public.ticket_cycles
      (ticket_id, cycle_number, started_at, resolved_at, outcome)
    VALUES
      (NEW.ticket_id, t.current_cycle, COALESCE(t.sla_started_at, t.created_at), NOW(), 'resolved')
    ON CONFLICT (ticket_id, cycle_number)
      DO UPDATE SET resolved_at = NOW(), outcome = 'resolved';

  ELSIF NEW.new_status = 'reopened' THEN
    -- The current cycle ends as "reopened"; a fresh cycle starts now and the
    -- SLA clock restarts (Phase 5 derives due dates from sla_started_at).
    UPDATE public.ticket_cycles
       SET ended_at = NOW(), outcome = 'reopened'
     WHERE ticket_id = NEW.ticket_id AND cycle_number = t.current_cycle;

    UPDATE public.tickets
       SET current_cycle = t.current_cycle + 1,
           sla_started_at = NOW(),
           resolved_at = NULL
     WHERE id = NEW.ticket_id;

    INSERT INTO public.ticket_cycles
      (ticket_id, cycle_number, started_at, outcome)
    VALUES
      (NEW.ticket_id, t.current_cycle + 1, NOW(), 'open')
    ON CONFLICT (ticket_id, cycle_number) DO NOTHING;

  ELSIF NEW.new_status IN ('closed', 'rejected') THEN
    v_outcome := CASE
      WHEN NEW.new_status = 'rejected' THEN 'rejected'
      ELSE COALESCE(t.closure_reason::TEXT, 'closed')
    END;
    UPDATE public.ticket_cycles
       SET ended_at = NOW(), outcome = v_outcome
     WHERE ticket_id = NEW.ticket_id AND cycle_number = t.current_cycle;
  END IF;

  -- ---------------- notifications ----------------
  IF NEW.new_status = 'resolved' THEN
    v_type    := 'ticket_resolved';
    v_title   := 'Verify your request ' || t.ticket_number;
    v_body    := COALESCE(NEW.notes, 'IT marked your request resolved.') ||
                 ' Please choose "Fix works" or "Still broken".';
    v_recipients := ARRAY[t.requester_id];

  ELSIF NEW.new_status = 'closed' AND t.closure_reason = 'verified_fixed' THEN
    v_type    := 'ticket_verified';
    v_title   := 'Fix confirmed on ' || t.ticket_number;
    v_body    := 'The requester confirmed the fix. This ticket is Closed (Verified Fixed).';
    v_recipients := ARRAY[t.assigned_to];
    IF t.assigned_to IS NULL THEN
      v_recipients := public.admin_ids();
    END IF;

  ELSIF NEW.new_status = 'reopened' THEN
    v_type    := 'ticket_reopened';
    v_title   := 'Reopened: ' || t.ticket_number;
    v_body    := COALESCE(NEW.reason, NEW.notes, 'The requester reports the issue is still broken.');
    v_recipients := ARRAY[t.assigned_to];
    IF t.assigned_to IS NULL THEN
      v_recipients := public.admin_ids();
    END IF;
    -- 2+ reopens escalate beyond the technician to the escalation recipients.
    IF t.reopened_count >= 2 THEN
      v_recipients := v_recipients || public.admin_ids();
    END IF;

  ELSIF NEW.new_status = 'waiting_for_user' THEN
    v_type    := 'ticket_info_requested';
    v_title   := 'More information needed for ' || t.ticket_number;
    v_body    := COALESCE(NEW.notes, 'IT needs more information about your request.');
    v_recipients := ARRAY[t.requester_id];

  ELSIF NEW.new_status = 'rejected' THEN
    v_type    := 'ticket_rejected';
    v_title   := 'Request ' || t.ticket_number || ' was rejected';
    v_body    := COALESCE(NEW.reason, NEW.notes, 'This request was rejected.');
    v_recipients := ARRAY[t.requester_id];

  ELSIF NEW.new_status = 'in_progress' AND NEW.old_status = 'waiting_for_user' THEN
    v_type    := 'ticket_reply';
    v_title   := 'Requester replied to ' || t.ticket_number;
    v_body    := 'The requester provided the requested information.';
    v_recipients := ARRAY[t.assigned_to];
    IF t.assigned_to IS NULL THEN
      v_recipients := public.admin_ids();
    END IF;

  ELSIF NEW.new_status = 'in_progress' THEN
    v_type    := 'ticket_assigned';
    v_title   := 'Assigned: ' || t.ticket_number;
    v_body    := 'You are the technician for this request.';
    v_recipients := ARRAY[t.assigned_to];

  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, ticket_id, type, title, body)
  SELECT DISTINCT u, NEW.ticket_id, v_type, v_title, v_body
  FROM unnest(v_recipients) AS u
  WHERE u IS NOT NULL
    AND (NEW.changed_by IS NULL OR u <> NEW.changed_by);

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_ticket_status_change ON public.ticket_status_history;
DROP TRIGGER IF EXISTS trg_ticket_status_change ON public.ticket_status_history;
CREATE TRIGGER trg_ticket_status_change
  AFTER INSERT ON public.ticket_status_history
  FOR EACH ROW
  EXECUTE FUNCTION public.on_ticket_status_change();


-- ===========================================================================
-- 20261111_03_phase4_no_response
-- ===========================================================================

-- Phase 4 — the automated no-response pass.
--
--
-- One function does the whole pass, in one transaction per call:
--   * 3 days after a request starts waiting on the requester -> one reminder
--   * 5 days after that                                    -> closed, No Response
--
-- Why the work is SQL and not JavaScript in the Worker: the close must go
-- through public.transition_ticket(), which is the only writer of ticket state.
-- Running the pass inside the database keeps the reminder, the notification and
-- the close in the same transaction, and means a replayed cron cannot
-- double-close anything.
--
-- Cutover guard: tickets whose waiting period started before the cutover are
-- ignored. Phase 1 migrated every legacy staff-closed ticket to Resolved, so
-- without this the first run would re-close the entire historical backlog.
--
-- Safe to re-run.

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tickets_awaiting_since
  ON public.tickets(awaiting_student_since)
  WHERE awaiting_student_since IS NOT NULL;

-- ---------------------------------------------------------------------------
-- The pass
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_no_response_job(
  p_now     TIMESTAMPTZ DEFAULT now(),
  p_cutover TIMESTAMPTZ DEFAULT '2026-11-11T00:00:00Z'
)
RETURNS TABLE (reminded INTEGER, closed INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  t          public.tickets;
  v_start    TIMESTAMPTZ;
  v_reminded INTEGER := 0;
  v_closed   INTEGER := 0;
  v_reminded_this_cycle BOOLEAN;
BEGIN
  -- Only the scheduled job (service_role) may run this. A normal user calling
  -- it must not be able to mass-close tickets.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the scheduled job can run the no-response pass'
      USING ERRCODE = '42501';
  END IF;

  FOR t IN
    SELECT *
    FROM public.tickets
    WHERE status IN ('resolved', 'waiting_for_user')
      AND COALESCE(resolved_at, awaiting_student_since) >= p_cutover
    FOR UPDATE SKIP LOCKED
  LOOP
    v_start := GREATEST(
      COALESCE(t.resolved_at, t.awaiting_student_since),
      COALESCE(t.awaiting_student_since, t.resolved_at)
    );

    CONTINUE WHEN v_start IS NULL;

    -- 5 days: close as No Response. transition_ticket() sets closure_reason,
    -- writes the audit row and fires the notification trigger.
    IF p_now - v_start >= INTERVAL '5 days' THEN
      PERFORM public.transition_ticket(t.id, 'close_no_response', '{}'::JSONB);
      v_closed := v_closed + 1;
      CONTINUE;
    END IF;

    -- 3 days: one reminder per waiting period.
    IF p_now - v_start >= INTERVAL '3 days' THEN
      v_reminded_this_cycle := t.reminder_sent_at IS NOT NULL
        AND t.reminder_sent_at >= v_start;

      IF NOT v_reminded_this_cycle THEN
        UPDATE public.tickets
           SET reminder_sent_at = p_now
         WHERE id = t.id;

        INSERT INTO public.notifications (user_id, ticket_id, type, title, body)
        VALUES (
          t.requester_id,
          t.id,
          'ticket_reminder',
          'We still need your reply on ' || t.ticket_number,
          'This request will be closed automatically in 2 days if we do not hear from you. '
            || 'Open it and reply, or choose "Fix works" / "Still broken" if it was resolved.'
        );
        v_reminded := v_reminded + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_reminded, v_closed;
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_no_response_job(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_no_response_job(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;


-- ===========================================================================
-- 20261111_04_phase5_sla_escalation
-- ===========================================================================

-- Phase 5 — SLA clocks, urgent path, supervisor duty, escalation.
--
--
-- Targets (placeholders from the brief, mirrored in utils/tickets/sla.ts):
--   Urgent  response 4 hours (24/7)   resolve 1 business day
--   High    response 1 business day   resolve 3 business days
--   Normal  response 2 business days  resolve 5 business days
--   Low     response 3 business days  resolve 7 business days
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Supervisor duty: a title on a staff account, not a new role
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_on_call BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_staff_title_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_staff_title_check
      CHECK (staff_title IS NULL OR staff_title IN ('technician', 'supervisor'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_supervisors
  ON public.profiles(is_on_call)
  WHERE staff_title = 'supervisor';

-- ---------------------------------------------------------------------------
-- 3. Privacy: consent at sign-up and soft deactivation
-- ---------------------------------------------------------------------------
-- When the requester accepted the Privacy Notice (privacy_consent_version
-- records which version was accepted, so the university can change the
-- notice and re-request consent later).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_consent_version TEXT;
-- Soft deactivation: accounts are deactivated, never deleted. Retention period
-- is to be set by UPHSD (documented as TBD).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_deactivated ON public.profiles(is_deactivated);

-- ---------------------------------------------------------------------------
-- 2. SLA + triage columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolve_due_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_status TEXT NOT NULL DEFAULT 'on_track';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0;
-- Why the requester said this is urgent (required for the urgent path).
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS priority_justification TEXT;
-- When a supervisor verified the urgent flag (NULL = not yet verified).
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS urgent_verified_at TIMESTAMPTZ;
-- The supervisor who verified urgency.
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS urgent_verified_by UUID REFERENCES public.profiles(id);
-- student vs employee, so the two populations can be reported separately.
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS requester_pool TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_sla_status_check') THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_sla_status_check
      CHECK (sla_status IN ('on_track', 'at_risk', 'breached'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_requester_pool_check') THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_requester_pool_check
      CHECK (requester_pool IS NULL OR requester_pool IN ('student', 'employee'));
  END IF;
END $$;

UPDATE public.tickets t
SET requester_pool = CASE WHEN p.role = 'employee' THEN 'employee' ELSE 'student' END
FROM public.profiles p
WHERE p.id = t.requester_id AND t.requester_pool IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_sla_open
  ON public.tickets(response_due_at, resolve_due_at)
  WHERE status IN ('open', 'in_progress', 'reopened', 'waiting_for_user');

-- ---------------------------------------------------------------------------
-- 3. Business-day maths (Asia/Manila has no DST, so calendar days are exact)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_business_day(d TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT EXTRACT(ISODOW FROM (d AT TIME ZONE 'Asia/Manila')) BETWEEN 1 AND 5;
$fn$;

CREATE OR REPLACE FUNCTION public.add_business_days(p_start TIMESTAMPTZ, p_days INTEGER)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  v TIMESTAMPTZ := p_start;
  i INTEGER := 0;
BEGIN
  IF p_days IS NULL OR p_days <= 0 THEN
    RETURN v;
  END IF;
  WHILE i < p_days LOOP
    v := v + INTERVAL '1 day';
    WHILE NOT public.is_business_day(v) LOOP
      v := v + INTERVAL '1 day';
    END LOOP;
    i := i + 1;
  END LOOP;
  RETURN v;
END;
$fn$;

-- The clock restarts on reopen (the Phase 2 trigger sets sla_started_at = now()
-- and clears resolved_at), so due dates are always derived, never carried over.
CREATE OR REPLACE FUNCTION public.set_ticket_sla()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_start TIMESTAMPTZ := COALESCE(NEW.sla_started_at, NEW.created_at, now());
BEGIN
  IF NEW.status IN ('closed', 'rejected') THEN
    RETURN NEW;
  END IF;

  NEW.sla_started_at := v_start;

  NEW.response_due_at := CASE NEW.priority
    WHEN 'urgent' THEN v_start + INTERVAL '4 hours'
    WHEN 'high'   THEN public.add_business_days(v_start, 1)
    WHEN 'medium' THEN public.add_business_days(v_start, 2)
    ELSE               public.add_business_days(v_start, 3)
  END;

  NEW.resolve_due_at := CASE NEW.priority
    WHEN 'urgent' THEN public.add_business_days(v_start, 1)
    WHEN 'high'   THEN public.add_business_days(v_start, 3)
    WHEN 'medium' THEN public.add_business_days(v_start, 5)
    ELSE               public.add_business_days(v_start, 7)
  END;

  NEW.sla_status := CASE
    WHEN now() >= NEW.resolve_due_at THEN 'breached'
    WHEN now() >= NEW.resolve_due_at - (NEW.resolve_due_at - v_start) * 0.2 THEN 'at_risk'
    ELSE 'on_track'
  END;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_ticket_sla ON public.tickets;
DROP TRIGGER IF EXISTS trg_ticket_sla ON public.tickets;
CREATE TRIGGER trg_ticket_sla
  BEFORE INSERT OR UPDATE OF priority, sla_started_at, status ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_sla();

-- Backfill due dates for tickets created before this migration.
UPDATE public.tickets
SET priority = priority
WHERE response_due_at IS NULL AND status NOT IN ('closed', 'rejected');

-- ---------------------------------------------------------------------------
-- 4. Escalation recipients + the escalation pass
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.escalation_recipients()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  WITH supervisors AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.staff_title = 'supervisor'
      AND p.role IN ('it_staff', 'admin', 'manager')
  ),
  fallback AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.role IN ('admin', 'manager')
  )
  SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::UUID[])
  FROM (
    SELECT id FROM supervisors WHERE EXISTS (SELECT 1 FROM supervisors)
    UNION
    SELECT id FROM fallback
  ) AS recipients;
$fn$;

REVOKE ALL ON FUNCTION public.escalation_recipients() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escalation_recipients() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.run_sla_escalation(p_now TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (escalated INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  t            public.tickets;
  v_level      INTEGER;
  v_recipients UUID[];
  v_count      INTEGER := 0;
  v_reason     TEXT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the scheduled job can run the escalation pass'
      USING ERRCODE = '42501';
  END IF;

  -- Keep the badge honest even for tickets whose priority never changes.
  UPDATE public.tickets
  SET sla_status = CASE
        WHEN p_now >= resolve_due_at THEN 'breached'
        WHEN p_now >= resolve_due_at - (resolve_due_at - sla_started_at) * 0.2 THEN 'at_risk'
        ELSE 'on_track'
      END
  WHERE status IN ('open', 'in_progress', 'reopened', 'waiting_for_user')
    AND resolve_due_at IS NOT NULL
    AND sla_started_at IS NOT NULL;

  FOR t IN
    SELECT *
    FROM public.tickets
    WHERE status IN ('open', 'in_progress', 'reopened', 'waiting_for_user')
    FOR UPDATE SKIP LOCKED
  LOOP
    v_level := CASE
      WHEN t.resolve_due_at IS NOT NULL AND p_now >= t.resolve_due_at THEN 3
      WHEN t.response_due_at IS NOT NULL AND p_now >= t.response_due_at THEN 2
      WHEN t.reopened_count >= 2 THEN 1
      ELSE 0
    END;

    CONTINUE WHEN v_level <= 0 OR v_level <= COALESCE(t.escalation_level, 0);

    v_reason := CASE v_level
      WHEN 3 THEN 'Resolution target passed'
      WHEN 2 THEN 'First-response target passed'
      ELSE 'Reopened more than once'
    END;

    UPDATE public.tickets
    SET escalation_level = v_level,
        escalated_at = COALESCE(escalated_at, p_now),
        sla_status = CASE WHEN v_level >= 2 THEN 'breached' ELSE 'at_risk' END
    WHERE id = t.id;

    v_recipients := public.escalation_recipients()
      || ARRAY[t.assigned_to];

    -- The cast is required: in INSERT ... SELECT an unquoted literal is typed
    -- as `text`, and Postgres has no implicit text -> enum cast, so without it
    -- the first escalation aborts the whole pass.
    INSERT INTO public.notifications (user_id, ticket_id, type, title, body)
    SELECT DISTINCT u, t.id, 'ticket_escalated'::public.notification_type,
      'Escalation: ' || t.ticket_number,
      v_reason || '. ' || t.subject
    FROM unnest(v_recipients) AS u
    WHERE u IS NOT NULL;

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_sla_escalation(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_sla_escalation(TIMESTAMPTZ) TO service_role;


-- ===========================================================================
-- 20261111_06_add_administrative_closure
-- ===========================================================================

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
-- that adds it, and the retirement script uses it.
--
-- Safe to re-run.

ALTER TYPE public.ticket_closure_reason ADD VALUE IF NOT EXISTS 'administrative_closure';

-- ---------------------------------------------------------------------------
-- System-wide audit log (append-only).
--
-- Records security-relevant and administrative events beyond ticket status
-- changes: role changes, user deactivation, imports, SLA/settings changes,
-- on-call changes, manual escalations, urgent verification.
--
-- Rows are inserted only via a SECURITY DEFINER function (or server action),
-- never directly by clients. RLS allows admin/manager SELECT only; no
-- UPDATE/DELETE is permitted by any role.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES public.profiles(id),
  actor_role public.user_role,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- Only admins and managers can read the audit log.
DROP POLICY IF EXISTS "Admins and managers can read audit log" ON public.audit_log;
CREATE POLICY "Admins and managers can read audit log" ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'manager')
    )
  );

-- No one can insert, update, or delete audit rows directly. Writes go through
-- the write_audit_log() SECURITY DEFINER function.
REVOKE ALL ON TABLE public.audit_log FROM authenticated;
REVOKE ALL ON TABLE public.audit_log FROM anon;

-- SECURITY DEFINER function to write audit entries. Called by server actions.
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role public.user_role;
BEGIN
  SELECT p.id, p.role INTO v_actor_id, v_actor_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_log
    (actor_id, actor_role, action, target_type, target_id, details, ip_address)
  VALUES
    (v_actor_id, v_actor_role, p_action, p_target_type, p_target_id, p_details, p_ip_address)
  RETURNING id INTO v_actor_id;

  RETURN v_actor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log(text, text, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, uuid, jsonb, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- SLA policies: configurable targets per priority, editable by admin.
-- Code reads this table and falls back to the constants in utils/tickets/sla.ts
-- when rows are missing. Existing tickets' due dates are NOT recalculated.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sla_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  priority public.ticket_priority NOT NULL UNIQUE,
  response_minutes INTEGER NOT NULL CHECK (response_minutes > 0),
  resolution_minutes INTEGER NOT NULL CHECK (resolution_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sla_policies_priority ON public.sla_policies(priority);

-- Everyone can read; only admin/manager can write.
DROP POLICY IF EXISTS "Authenticated users can read SLA policies" ON public.sla_policies;
CREATE POLICY "Authenticated users can read SLA policies" ON public.sla_policies
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin/manager can write SLA policies" ON public.sla_policies;
CREATE POLICY "Admin/manager can write SLA policies" ON public.sla_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'manager')
    )
  );

-- Seed from current constants.
INSERT INTO public.sla_policies (priority, response_minutes, resolution_minutes) VALUES
  ('urgent', 240, 1440),
  ('high', 1440, 4320),
  ('medium', 2880, 7200),
  ('low', 4320, 10080)
ON CONFLICT (priority) DO NOTHING;

-- Keep updated_at fresh.
DROP TRIGGER IF EXISTS trg_sla_policies_updated_at ON public.sla_policies;
CREATE TRIGGER trg_sla_policies_updated_at
  BEFORE UPDATE ON public.sla_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.sla_policies TO anon, authenticated;
