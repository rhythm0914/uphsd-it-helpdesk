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
-- APPLICATION: run this whole file in the Supabase SQL Editor against the
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
CREATE POLICY "Authenticated users can read published knowledge articles"
  ON public.knowledge_articles
  FOR SELECT
  TO authenticated
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "Admin/manager can read all knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/manager can read all knowledge articles"
  ON public.knowledge_articles
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin/manager can create knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/manager can create knowledge articles"
  ON public.knowledge_articles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin/manager can update knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/manager can update knowledge articles"
  ON public.knowledge_articles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin/manager can delete knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admin/manager can delete knowledge articles"
  ON public.knowledge_articles
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

COMMIT;

-- =====================================================================
-- VERIFICATION (run AFTER applying, in the SQL Editor)
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