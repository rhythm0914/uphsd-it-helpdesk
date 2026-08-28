# UPHSD IT Help Desk — Project Documentation

## 1. Project Overview

**Project Name:** UPHSD IT Help Desk  
**Repository:** https://github.com/rhythm0914/uphsd-it-helpdesk  
**Git Remote:** https://github.com/rhythm0914/uphsd-it-helpdesk.git  
**Production URL:** https://uphsd-it-helpdesk.rycanano.workers.dev/  
**Official UPHSD Website:** https://perpetualdalta.edu.ph/new/  
**Current Branch:** `main`  
**Technology Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Supabase, Cloudflare Workers (vinext)

---

## 2. Development Phases

### Phase 1: Foundation
- **Status:** Completed
- **Commit:** `2cc0b7c` - "feat: initialize Next.js landing page with institutional design"
- **Work:**
  - Initialized Next.js 16 project with TypeScript and Tailwind CSS v4
  - Configured project structure (`app/` directory)
  - Set up design tokens in `app/globals.css`
  - Configured Geist fonts
  - Set up `.env.example` for Supabase variables
  - Installed dependencies

### Phase 2: Landing Page
- **Status:** Completed
- **Commit:** `2cc0b7c` - "feat: initialize Next.js landing page with institutional design"
- **Work:**
  - Created 8-section public landing page
  - Implemented 6 distinct layout families:
    1. Split Hero (text + image)
    2. Editorial Band (full-width text)
    3. Bento Grid (services)
    4. Vertical Timeline (process)
    5. Split Showcase (tracking preview)
    6. Card Grid (reports)
    7. Image Split (security)
    8. Editorial CTA (final call-to-action)
  - Added responsive navigation
  - Integrated real imagery via Picsum placeholders
  - Applied institutional design system (slate neutrals, deep blue accent)
  - Passed Taste Skill v2 pre-flight audits
  - Passed em-dash audit
  - Passed hero discipline audit
  - Passed section-layout-repetition audit

### Phase 2.5: Cloudflare Deployment Preparation
- **Status:** Completed
- **Commit:** `925ca48` - "feat: configure vinext for Cloudflare Workers deployment"
- **Work:**
  - Ran `vinext check` compatibility check (78% compatible)
  - Initialized vinext for Cloudflare Workers deployment
  - Generated `vite.config.ts` with vinext and Cloudflare plugins
  - Generated `wrangler.jsonc` with Workers configuration
  - Added vinext scripts to `package.json`:
    - `dev:vinext` - vinext dev server
    - `build:vinext` - production build
    - `start:vinext` - local Worker server
    - `deploy:vinext` - Cloudflare deployment
  - Installed dependencies: `vinext`, `@vinext/cloudflare`, `vite`, `@cloudflare/vite-plugin`, `wrangler`
  - Verified `npm run build:vinext` succeeds
  - Configured for full-stack Next.js on Cloudflare Workers (not static Pages)

### Phase 2.6: Supabase Foundation
- **Status:** Completed
- **Commit:** `028d0fe` - "feat: add Supabase client helpers and session middleware"
- **Work:**
  - Installed `@supabase/supabase-js` and `@supabase/ssr`
  - Created `utils/supabase/server.ts` - server-side client for Server Components
  - Created `utils/supabase/client.ts` - browser client for Client Components
  - Created `utils/supabase/middleware.ts` - session-refreshing middleware helper
  - Created `middleware.ts` - root Next.js middleware to keep Supabase sessions refreshed
  - Created `.env.local` with Supabase credentials (gitignored)
  - Updated `.env.example` with Supabase variable placeholders
  - Fixed TypeScript error in middleware cookie handling
  - Verified `npm run build` and `npm run build:vinext` both pass

### Phase 2.7: Branding & Audience Update
- **Status:** Completed
- **Commit:** `8a95396` - "feat: update landing page branding and audience"
- **Work:**
  - Changed audience from "employees and IT staff" to "students and employees"
  - Removed fake operational metrics (147 requests, 2.4 days, 4.6/5, 8 staff)
  - Replaced reports card grid with neutral editorial section about real database records
  - Added FAQ section with student/employee-focused questions
  - Added business hours: Monday – Friday, 8:00 AM – 5:00 PM
  - Updated services to student/employee-relevant categories
  - Added official UPHSD logo (`public/branding/uphsd-logo.png`)
  - Added UPHSD institutional brand colors (maroon, gold, blue)
  - Updated navigation and footer
  - Added favicon reference to UPHSD logo

### Phase 2.8: Production HTTP 500 Fix
- **Status:** Completed
- **Commit:** `9a3dbc8` - "fix: resolve production HTTP 500 by adding Supabase env vars to wrangler.jsonc"
- **Work:**
  - Identified root cause: Supabase environment variables were not available in Cloudflare Worker runtime
  - Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `wrangler.jsonc` under `[vars]`
  - Added defensive error handling in `utils/supabase/middleware.ts` to prevent crashes when env vars are missing
  - Made `createClient` async and properly awaited `supabase.auth.getUser()`
  - Verified `npm run build` and `npm run build:vinext` both pass

### Phase 2.9: UPHSD Full Rebrand
- **Status:** Completed
- **Commit:** `93c9389` - "feat: align help desk with UPHSD branding"
- **Work:**
  - Replaced blue/dark-mode SaaS aesthetic with UPHSD institutional maroon/gold/light theme
  - Updated `globals.css` with new UPHSD color tokens
  - Removed blue as primary brand color
  - Light mode is now the default experience
  - Redesigned navbar, hero, services, FAQ, footer
  - Added business hours section
  - Hardened middleware with complete try/catch wrapper

### Phase 4: IT Staff Queue & Ticket Management
- **Status:** Completed and Deployed
- **Work:**
  - Created IT staff queue page (`/portal/queue`) with filterable ticket table
  - Built ticket detail page for IT staff (`/portal/queue/[id]`)
  - Added role-based nav link (IT Queue) visible only to `it_staff`, `admin`, `manager`
  - Implemented ticket assignment to staff members with status auto-update to `in_progress`
  - Implemented status updates with optional notes and history tracking
  - Added work remarks system with internal note support
  - Created shared data-fetching library (`app/portal/queue/lib.ts`) to avoid module resolution issues with `"use server"` files in dynamic route segments
  - Migrated ticket management client component to use browser-side Supabase client for mutations
  - Verified production deployment of all new routes

### Phase 3: Student/Employee Portal + Authentication + Database Foundation
- **Status:** Completed and Deployed
- **Commit:** `ff41ef6` - "feat: implement phase 3 help desk portal foundation"
- **Work:**
  - Created Supabase database schema (`supabase/schema.sql`)
  - Implemented authentication pages (`/login`, `/signup`)
  - Created protected portal layout (`/portal/layout.tsx`)
  - Built student/employee dashboard (`/portal`)
  - Implemented ticket creation form (`/portal/request`)
  - Created ticket detail page (`/portal/tickets/[id]`)
  - Updated middleware with route protection
  - Added server-side authorization checks
  - Verified production deployment

---

## 3. Current File Structure

```
app/
  favicon.ico
  globals.css
  layout.tsx
  page.tsx
  login/
    page.tsx
  signup/
    page.tsx
  portal/
    layout.tsx
    page.tsx
    request/
      page.tsx
    queue/
      page.tsx
      lib.ts
      actions.ts
      [id]/
        page.tsx
        actions.ts
        ticket-management.tsx
    admin/
      layout.tsx
      page.tsx
      users/
        page.tsx
        actions.ts
      services/
        page.tsx
        actions.ts
        service-management.tsx
      reports/
        page.tsx
        actions.ts
      archive/
        page.tsx
        actions.ts
        archive-management.tsx
    tickets/
      [id]/
        page.tsx
middleware.ts
utils/
  supabase/
    client.ts
    middleware.ts
    server.ts
public/
  branding/
    uphsd-logo.png
  file.svg
  globe.svg
  next.svg
  vercel.svg
  window.svg
supabase/
  schema.sql
vite.config.ts
wrangler.jsonc
next.config.ts
package.json
tsconfig.json
.env.example
.env.local (gitignored)
PROJECT.md
```

---

## 4. Environment Variables

### `.env.example` (committed)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### `.env.local` (gitignored, local only)
```env
NEXT_PUBLIC_SUPABASE_URL=https://vrnkzglwzwojrxlpofss.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_P2SvmRz1D8X5ffGEoxN12Q_IuO8bUvO
```

### `wrangler.jsonc` (committed, contains public vars)
```jsonc
{
  "vars": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://vrnkzglwzwojrxlpofss.supabase.co",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_P2SvmRz1D8X5ffGEoxN12Q_IuO8bUvO"
  }
}
```

**Note:** These are public Supabase publishable keys, not secrets. They are safe to include in the Worker configuration. The private service-role key is never committed.

---

## 5. Database Schema (Phase 3)

### Tables Created

#### `profiles`
- `id` (UUID, PK, references auth.users)
- `email` (TEXT, NOT NULL)
- `full_name` (TEXT, NOT NULL)
- `role` (user_role enum: student, employee, it_staff, admin, manager)
- `department` (TEXT, nullable)
- `student_number` (TEXT, nullable)
- `employee_id` (TEXT, nullable)
- `phone` (TEXT, nullable)
- `avatar_url` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `services`
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE, NOT NULL)
- `description` (TEXT, nullable)
- `is_active` (BOOLEAN, DEFAULT TRUE)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `ticket_categories`
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE, NOT NULL)
- `description` (TEXT, nullable)
- `is_active` (BOOLEAN, DEFAULT TRUE)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `tickets`
- `id` (UUID, PK)
- `ticket_number` (TEXT, UNIQUE, NOT NULL)
- `requester_id` (UUID, FK to profiles)
- `assigned_to` (UUID, FK to profiles, nullable)
- `service_id` (UUID, FK to services)
- `category_id` (UUID, FK to ticket_categories)
- `subject` (TEXT, NOT NULL)
- `description` (TEXT, NOT NULL)
- `priority` (ticket_priority enum: low, normal, high, urgent)
- `status` (ticket_status enum: open, in_progress, waiting_for_user, resolved, closed)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `closed_at` (TIMESTAMPTZ, nullable)

#### `ticket_status_history`
- `id` (UUID, PK)
- `ticket_id` (UUID, FK to tickets)
- `old_status` (ticket_status, nullable)
- `new_status` (ticket_status, NOT NULL)
- `changed_by` (UUID, FK to profiles, nullable)
- `notes` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ)

#### `ticket_messages`
- `id` (UUID, PK)
- `ticket_id` (UUID, FK to tickets)
- `sender_id` (UUID, FK to profiles)
- `message` (TEXT, NOT NULL)
- `is_internal` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ)

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:
- **profiles:** Users can view/update their own profile. Admins can view all profiles.
- **services/ticket_categories:** Readable by all authenticated users.
- **tickets:** Users can view their own tickets. IT staff/admin/manager can view all tickets. Users can create tickets. IT staff/admin/manager can update tickets.
- **ticket_status_history:** Users can view history of accessible tickets.
- **ticket_messages:** Users can view/create messages for accessible tickets.

### Default Data
- 10 default services inserted
- 10 default ticket categories inserted
- Ticket numbers auto-generated using database trigger (`IT-YYYY-NNNNNN` format)

---

## 5. Cloudflare Deployment Configuration

### Current Setup: Cloudflare Workers + vinext

**Why not Cloudflare Pages:**
- This is a full-stack Next.js 16 application
- Requires server-side features (auth, route handlers, server actions)
- Cloudflare Pages only supports static Next.js exports
- Current `next.config.ts` has no `output: "export"`

### vinext Configuration Files
- `vite.config.ts` - Vite configuration with vinext and Cloudflare plugins
- `wrangler.jsonc` - Cloudflare Workers configuration with Supabase env vars

### Build Output
- `dist/client/` - Static assets (gitignored)
- `dist/server/` - Worker/server code (gitignored)

### Production Deployment Workflow

**GitHub is the single source of truth for production deployments.**

Normal production deployment:
1. Commit changes locally
2. Push to `main` branch: `git push origin main`
3. Cloudflare automatically builds and deploys the Worker
4. Verify the production deployment

**Cloudflare Git Integration:**
The repository is connected to Cloudflare for automatic deployments. When code is pushed to `main`, Cloudflare:
1. Clones the repository
2. Installs dependencies (`npm install`)
3. Builds the project (`npm run build:vinext`)
4. Deploys the Worker to production

**Manual/Emergency Deployment:**
If automatic deployment is unavailable, manual deployment can be performed locally:

```bash
npm run build:vinext
npm run deploy:vinext
```

This requires `CLOUDFLARE_API_TOKEN` to be set in your environment. Manual deployment should only be used for emergency fixes or when the automatic pipeline is unavailable.

### Deployment Prerequisite
- Cloudflare Git integration must be configured in the Cloudflare Dashboard for the `uphsd-it-helpdesk` Worker
- The build command should be set to `npm run build:vinext`
- `CLOUDFLARE_API_TOKEN` is only required for manual/emergency deployments

### Production Issue History
- **Issue:** Production returned HTTP 500 Internal Server Error
- **Root Cause:** Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) were not available in the Cloudflare Worker runtime
- **Why local build passed:** `.env.local` existed locally, so `vinext build` could read the vars at build time
- **Why Cloudflare runtime failed:** The deployed Worker had no `vars` configuration. The generated `dist/server/wrangler.json` had `"vars": {}`
- **Fix:** Added the public Supabase vars to `wrangler.jsonc` under `[vars]`, which flows through to the generated `dist/server/wrangler.json` and the deployed Worker
- **Additional fix:** Added defensive error handling in `utils/supabase/middleware.ts` so missing env vars don't crash the entire site
- **Additional hardening:** Wrapped entire middleware in try/catch to prevent any unhandled exception from causing site-wide 500

### Deployment Version History Note

Cloudflare Version History may show both "Git" and "Manually deployed" entries. This is historical and does not indicate competing deployment mechanisms. The current production traffic is served by the Git-based deployment pipeline. Manual deployments are only performed for emergency fixes.

---

## 6. Authentication & Routes (Phase 6)

### Authentication
- **Sign Up:** `/auth/sign-up` - Public registration with UPHSD email validation (student/employee roles only)
- **Sign In:** `/auth/sign-in` - Email/password authentication via Supabase
- **Forgot Password:** `/auth/forgot-password` - Password reset request via Supabase
- **Update Password:** `/auth/update-password` - Set new password after recovery
- **Email Verification Callback:** `/auth/callback` - Handles email verification and password reset tokens
- **Sign Out:** Server action (`app/auth/actions.ts`) that signs out and redirects to home
- **Session Management:** Supabase Auth with cookie-based sessions
- **Middleware:** Refreshes sessions on every request and protects portal/admin routes

### Protected Routes
- `/portal` - Student/Employee Dashboard (requires authentication)
- `/portal/request` - Ticket creation form (requires authentication)
- `/portal/tickets/[id]` - Ticket detail view (requires authentication, ownership enforced by RLS)
- `/portal/queue` - IT Staff Queue (requires `it_staff`, `admin`, or `manager` role)
- `/portal/queue/[id]` - IT Ticket Management (requires `it_staff`, `admin`, or `manager` role)
- `/portal/admin` - Admin Dashboard (requires `admin` or `manager` role)
- `/portal/admin/*` - All admin sub-pages (requires `admin` or `manager` role)

### Public Routes
- `/` - Landing page
- `/auth/sign-in` - Sign in page (redirects to /portal if already authenticated)
- `/auth/sign-up` - Registration page (redirects to /portal if already authenticated)
- `/auth/forgot-password` - Password reset request page
- `/auth/update-password` - Password update page
- `/auth/callback` - Email verification and password reset callback
- `/login` - Redirects to `/auth/sign-in` (backward compatibility)
- `/signup` - Redirects to `/auth/sign-up` (backward compatibility)

### Route Protection Logic
Middleware checks:
1. Is the user authenticated?
2. Are they trying to access a portal or admin route?
3. If not authenticated and accessing protected route → redirect to `/auth/sign-in`
4. If authenticated and accessing auth routes → redirect to `/portal`

### Authorization Rules
- **student/employee:** Can access `/portal`, `/portal/request`, `/portal/tickets/[id]`
- **it_staff:** Can access student/employee routes + `/portal/queue`, `/portal/queue/[id]`
- **admin/manager:** Can access all routes including `/portal/admin` and sub-pages
- **Unauthorized admin access:** Server-side role check in every admin layout/page; client-side nav hiding is not sufficient

### Email Policy
- Public registration requires `@perpetual.edu.ph` email domain
- Self-registration is limited to `student` and `employee` roles
- `admin` and `manager` roles can only be assigned by existing administrators

### Password Policy
- Minimum 8 characters
- Confirmation field must match
- Enforced on signup and password reset

### Supabase Dashboard Configuration
The following must be configured in the Supabase Dashboard for production:

**Authentication → URL Configuration:**
- **Site URL:** `https://uphsd-it-helpdesk.rycanano.workers.dev`
- **Allowed redirect URLs:**
  - `https://uphsd-it-helpdesk.rycanano.workers.dev/auth/callback`
  - `http://localhost:3000/auth/callback` (for local development)

**Email Templates:**
- Ensure confirmation emails reference the production Site URL
- The application explicitly sets `emailRedirectTo` for signup and password reset emails

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/publishable key (public)
- `NEXT_PUBLIC_BASE_URL` - Application base URL
  - Production: `https://uphsd-it-helpdesk.rycanano.workers.dev`
  - Local: `http://localhost:3000`

### Database Initialization
The Supabase database schema is defined in `supabase/schema.sql`. To initialize production:

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/schema.sql`
3. Execute the script

This creates:
- Tables: `profiles`, `services`, `ticket_categories`, `tickets`, `ticket_status_history`, `ticket_messages`, `imports`
- Enums: `user_role`, `ticket_status`, `ticket_priority`
- Indexes for performance
- RLS policies for security
- Triggers for auto-generated ticket numbers and updated_at timestamps
- **Default seed data:** 10 services and 10 ticket categories (idempotent via `ON CONFLICT DO NOTHING`)

**Default Services:**
University Email, Microsoft 365, Microsoft Teams, Canvas, Network / Wi-Fi, Computer Support, Printer Support, Software Support, Account & Access, General IT Support

**Default Categories:**
Account & Password, Email, Microsoft 365 / Teams, Canvas, Network / Wi-Fi, Hardware, Software, Printer, Access Request, General IT Question

### Ongoing Service/Category Management
After initialization, admin/manager users can manage services and categories at:
- `/portal/admin/services`

Do not manually edit database records unless necessary. Use the admin UI for ongoing management.

### Request Form Data
`/portal/request` queries active services and categories from the database. If the database is empty or unavailable:
- Error state: Shows "Services and categories are currently unavailable"
- Empty state: Shows "No services or categories are configured yet"

Users cannot submit tickets without valid service and category selections.

---

## 7. Ticket System (Phase 3)

### Ticket Lifecycle
1. **open** - Newly submitted request
2. **in_progress** - IT staff is working on it
3. **waiting_for_user** - Waiting for requester response
4. **resolved** - Issue resolved, awaiting confirmation
5. **closed** - Fully completed

### Priority Levels
- **low** - Minor issue, no immediate impact
- **normal** - Standard request
- **high** - Important, affects work/study
- **urgent** - Critical, blocking work/study

### Ticket Number Format
- Auto-generated: `IT-YYYY-NNNNNN` (e.g., `IT-2026-000001`)
- Generated by database trigger on insert
- Human-readable, unique per ticket

### Ticket Creation
- Service selection (required)
- Category selection (required)
- Subject (required, max 200 chars)
- Description (required)
- Priority (optional, defaults to normal)
- Status auto-set to `open`

---

## 8. Current Known Issues / TODOs

### Phase 3: Student/Employee Portal
- [x] Create Supabase database schema
- [x] Implement authentication (login/logout)
- [x] Create role-based access control
- [x] Build student/employee dashboard
- [x] Implement request creation form
- [x] Implement request tracking with status history
- [x] Add request ID generation (IT-YYYY-NNNNNN)
- [ ] Create knowledge base structure
- [ ] Implement notifications foundation
- [ ] Implement evaluation system

### Phase 4: IT Staff Dashboard
- [x] Build IT request queue
- [x] Add filters, search, sorting
- [x] Implement request assignment
- [x] Add status updates and work remarks
- [x] Implement completion workflow

### Phase 5: Administrator Dashboard
- **Status:** Completed and Deployed
- **Work:**
  - Created admin dashboard layout with sidebar navigation (`/portal/admin/layout.tsx`)
  - Built admin dashboard home (`/portal/admin`) with system stats and quick actions
  - Implemented user management page (`/portal/admin/users`) with user list
  - Implemented services & categories management (`/portal/admin/services`) with add/create functionality
  - Implemented reports & analytics page (`/portal/admin/reports`) with real database data
  - Implemented archive & export page (`/portal/admin/archive`) with CSV/JSON export
  - Added Admin nav link to portal layout for admin/manager roles
  - Verified production deployment of all admin routes

### Phase 6: Authentication & User Onboarding
- **Status:** Completed and Deployed
- **Milestone:** Phase 6.1 — Authentication UI & Registration Flow
- **Work:**
  - Created `/auth/sign-in` with server-side authentication and error handling
  - Created `/auth/sign-up` with UPHSD email validation, password confirmation, and secure profile creation
  - Created `/auth/forgot-password` with password reset request via Supabase
  - Created `/auth/update-password` for setting a new password after recovery
  - Created `/auth/callback` route handler for email verification and password reset tokens
  - Implemented server actions for all auth operations (`app/auth/actions.ts`)
  - Added UPHSD institutional email domain validation (`@perpetual.edu.ph`)
  - Enforced minimum 8-character password policy with confirmation matching
  - Restricted public signup to `student` and `employee` roles only
  - Updated middleware to recognize all `/auth/*` routes and redirect unauthenticated users to `/auth/sign-in`
  - Updated landing page navbar and CTA to link to `/auth/sign-in`
  - Updated portal and admin layouts to use server-action sign-out
  - Maintained backward compatibility: `/login` and `/signup` redirect to `/auth/sign-in` and `/auth/sign-up`

### Phase 6: Authentication & User Onboarding
- [x] Authentication UI & Registration Flow
- [x] UPHSD email validation
- [x] Password validation and reset flow
- [x] Email verification callback
- [x] Secure role assignment
- [ ] Authentication hardening & account recovery enhancements

### Phase 6.2: Import/Export & Duplicate Detection
- [x] CSV export (all tickets, with filters)
- [x] JSON export (all tickets, with filters)
- [x] Controlled CSV import with validation
- [x] Duplicate request detection (exact and possible)
- [x] Import preview with validation status
- [x] Import confirmation workflow
- [x] Error reporting and result summary
- [x] CSV template download
- [x] Role-based access control
- [x] CSV formula injection protection

### Phase 6.3: Production Data Initialization & Auth Callback Hardening
- **Status:** Completed and Deployed
- **Work:**
  - Added `emailRedirectTo` to signup server action pointing to `/auth/callback`
  - Added `NEXT_PUBLIC_BASE_URL` environment variable with production fallback
  - Updated `.env.example` with `NEXT_PUBLIC_BASE_URL`
  - Updated `wrangler.jsonc` with `NEXT_PUBLIC_BASE_URL`
  - Improved `/portal/request` error/empty states for services/categories
  - Documented Supabase dashboard configuration requirements
  - Documented database initialization and seed data process
  - Verified production deployment

### Phase 6.4: Service → Category Relationship & Dynamic Category Filtering
- **Status:** Completed and Deployed
- **Work:**
  - Added `service_categories` junction table to `supabase/schema.sql`
  - Added RLS policies for `service_categories`
  - Added seed mappings for default service/category relationships
  - Created `/api/service-categories` API route for fetching categories by service
  - Updated `/portal/request` to dynamically load categories based on selected service
  - Category dropdown is disabled until a service is selected
  - Changing service resets category selection and reloads categories
  - Added empty/error states for category loading
  - Added server-side validation in `submitRequest` to reject invalid service/category combinations
  - Updated admin `/portal/admin/services` with service-category mapping management UI
  - Admin can view mapped/unmapped categories per service
  - Admin can add/remove category mappings
  - Updated import validation to reject unmapped service/category combinations
  - Preserved all existing tickets and data compatibility
  - Verified production deployment

### Phase 6.4.1: Admin Authorization & Portal Caching Fix
- **Status:** Completed, not yet deployed
- **Commit:** `f15599b` - "fix: resolve admin authorization and portal caching"
- **Root Cause:**
  - vinext static analysis cannot detect dynamic API usage (`headers()`, `cookies()`, `redirect()`), causing authenticated portal routes to risk incorrect caching/statically rendered responses
  - Profile lookup errors were silently ignored, treating database/RLS failures identically to "not an admin"
  - Inconsistent unauthenticated redirects (`/login` vs `/auth/sign-in`)
- **Fix:**
  - Added `export const dynamic = 'force-dynamic'` to all authenticated portal pages to prevent vinext from caching user-specific responses
  - Added explicit Supabase profile error handling in all portal layouts/pages
  - Standardized all unauthenticated redirects to `/auth/sign-in`
  - Admin authorization now uses explicit role comparison (`role !== 'admin' && role !== 'manager'`) instead of `.includes()`
- **Files Changed:**
  - `app/portal/admin/layout.tsx`
  - `app/portal/admin/page.tsx`
  - `app/portal/admin/reports/page.tsx`
  - `app/portal/admin/services/page.tsx`
  - `app/portal/admin/users/page.tsx`
  - `app/portal/layout.tsx`
  - `app/portal/page.tsx`
  - `app/portal/queue/page.tsx`
  - `app/portal/queue/[id]/page.tsx`
  - `app/portal/request/page.tsx`
  - `app/portal/tickets/[id]/page.tsx`
- **Authorization Logic:**
  ```
  supabase.auth.getUser() → user.id
  → profiles query WHERE id = user.id
  → profiles.role
  → admin/manager → allow
  → all others → redirect /portal
  ```
- **Navigation:**
  - Admin Dashboard visible to `admin` and `manager` roles
  - IT Queue visible to `it_staff`, `admin`, and `manager` roles
  - Client-side nav hiding is complementary; server-side authorization remains authoritative
- **Verification:**
  - `npm run lint` — PASS
  - `npm run build` — PASS
  - `npm run build:vinext` — PASS
- **Production Deployment:** Pending — requires `CLOUDFLARE_API_TOKEN`

### Phase 6.4.2: Service-Category Order Syntax Fix
- **Status:** Completed and Deployed
- **Commit:** `f6e65fe` - "fix: resolve service-category order syntax and empty results"
- **Root Cause:** `.order("category:name")` is invalid Supabase JS syntax, causing PostgREST parse errors that returned empty arrays instead of mapped categories
- **Fix:** Removed invalid `.order("category:name")` and replaced with client-side `localeCompare` sorting
- **Files Changed:**
  - `app/api/service-categories/route.ts`
  - `app/portal/admin/services/actions.ts`

### Phase 7: Testing
- **Status:** Completed and Deployed
- **Commit:** `b0239a6` - "test: add Phase 7 auth tests, security review, and remove temporary diagnostics"
- **Work:**
  - Added Vitest test framework with unit and authorization tests
  - Added Playwright E2E test framework for public/auth flows
  - Extracted shared authorization utility (`utils/authorization.ts`) to centralize role checks
  - Removed all temporary production diagnostics from auth and portal code
  - Added unit tests for role authorization, signup role normalization, and privilege boundaries
  - Added E2E smoke tests for sign-in, sign-up, forgot-password, and protected-route redirects
  - Verified signup cannot create admin/manager/it_staff through public form
  - Verified profile creation trigger and INSERT policy are in place
  - Verified no passwords, tokens, cookies, or secrets are logged
- **Test Coverage:**
  - Unit tests: 16 passing
  - E2E tests: Playwright configured for auth smoke tests
- **Scripts:**
  - `npm run test` — run Vitest
  - `npm run test:watch` — run Vitest in watch mode
  - `npm run test:e2e` — run Playwright E2E tests
- **Files Added:**
  - `vitest.config.ts`
  - `playwright.config.ts`
  - `tests/unit/authorization.test.ts`
  - `tests/unit/authorization-behavior.test.ts`
  - `tests/e2e/auth.spec.ts`
  - `utils/authorization.ts`
- **Security Review:**
  - No privilege escalation path found through public signup
  - RLS remains enabled on all tables
  - Profile trigger validates role before insert; defaults to `student`
  - No service-role keys exposed to client or Worker vars
  - Internal message visibility requires manual policy review if requester visibility changes
- **Verification:**
  - `npm run lint` — PASS
  - `npm run build` — PASS
  - `npm run build:vinext` — PASS
  - `npm run test` — PASS

### Phase 7.1: Auth Redirect Loop Fix & Request Submission Repair
- **Status:** Completed and Deployed
- **Commit:** `6311c41` - "fix: break auth redirect loop when profile row is missing"
- **Root Cause:**
  - For an authenticated user whose `profiles` row is missing or unreadable, `app/portal/page.tsx` and `app/portal/layout.tsx` redirected to `/auth/sign-in`, while the middleware redirects authenticated users on `/auth/*` back to `/portal`. The two guards fought each other, producing an infinite `ERR_TOO_MANY_REDIRECTS` loop (`/portal → /auth/sign-in → /portal → ...`).
  - The same missing-profile redirect still existed on `/portal/request` and the `/portal/queue` pages, so after the portal fix a user with no profile row still could not reach the submission form (and submitting a ticket requires `requester_id` to reference an existing `profiles` row via a foreign key).
- **What was fixed:**
  - Profile lookup failures are no longer treated as "unauthenticated". `app/portal/page.tsx` and `app/portal/layout.tsx` now fall back to a least-privilege default derived from validated auth `user_metadata` instead of redirecting to sign-in.
  - `app/portal/request/page.tsx` no longer fetches/gates on the profile (the form does not use role); it only requires an authenticated user.
  - `submitRequest` (`app/portal/request/actions.ts`) now upserts the requester's profile (`ON CONFLICT (id) DO NOTHING`) before inserting the ticket, so a missing profile cannot fail the `requester_id` foreign key.
  - `/portal/queue` pages now redirect missing-profile users to `/portal` (least privilege, loop-free) instead of `/auth/sign-in`.
- **Security:** `/portal`, `/portal/request`, and all admin/queue routes remain authenticated; missing-profile users never gain privileges beyond a `student` default. RLS and email confirmation unchanged. No DB changes.
- **Files Changed:**
  - `app/portal/layout.tsx`
  - `app/portal/page.tsx`
  - `app/portal/request/page.tsx`
  - `app/portal/request/actions.ts`
  - `app/portal/queue/page.tsx`
  - `app/portal/queue/[id]/page.tsx`
- **Verification:**
  - `npm run build` — PASS
  - `npx tsc --noEmit` — PASS
  - `npm run build:vinext` — PASS
  - `npx vitest run` — 16/16 PASS

### Phase 7.2: RLS Recursion & Table Grants Fix (Root Cause of Auth Errors)
- **Status:** Completed (DB migration must be run in Supabase - see `supabase/fix-rls-recursion.sql`)
- **Root Cause (database):**
  - The `"Admins can view all profiles"` RLS policy read `public.profiles` from within a `USING` clause *on `public.profiles`*, causing PostgREST **`infinite recursion detected in policy for relation "profiles"`**. Every policy that subqueries `public.profiles` (tickets, service_categories, imports, profiles) inherited this failure. This was the true cause behind the profile-read failures that the earlier redirect-loop symptoms pointed to.
  - The `anon`/`authenticated` roles were **not GRANTed access** to the public tables, so PostgREST returned `42501 permission denied for table`, which the request page surfaced as "Services and categories are currently unavailable" (a SELECT blocked by RLS yields `[]`, not an error; an error means a grants or recursion failure).
- **Now fixed in code/schema:**
  - Replaced the recursive admin policy with a non-recursive one backed by a `SECURITY DEFINER` helper `public.is_admin()` (executes outside the invoker's RLS, so it cannot recurse).
  - Added `GRANT SELECT/INSERT/UPDATE/DELETE` for the `authenticated` role and `SELECT` for `anon` + sequence usage, so PostgREST policies can be evaluated while RLS still enforces row-level access.
- **What you must run:** copy `supabase/fix-rls-recursion.sql` into the Supabase SQL Editor and execute. No app redeploy is required for this fix, and no data is dropped.
- **Files Changed:**
  - `supabase/schema.sql`
  - `supabase/fix-rls-recursion.sql`

### Phase 7.3: Loading & Interaction Feedback (UX)
- **Status:** Completed
- **Why:** Buttons/actions gave no visual feedback while Server Actions and navigations were pending, making the app feel slow or unresponsive on click.
- **What was added (dependency-free, no npm packages):**
  - `components/ui/spinner.tsx` — reusable dots-ring spinner (pure Tailwind/CSS, `aria-hidden`, honors `prefers-reduced-motion`).
  - `components/ui/submit-button.tsx` — client component using React's `useFormStatus()`: shows spinner + "Submitting…" label, disables the button, sets `aria-busy`, prevents double-submits; works inside server-component forms.
  - `components/ui/route-progress.tsx` — thin top progress bar shown while a route navigation is in flight (uses `usePathname` to reset).
  - `app/globals.css` — added dots-ring / route-progress keyframes with `prefers-reduced-motion` fallbacks.
- **Wired into:** request form submit, sign-in / sign-up / forgot-password / update-password buttons, admin service management (add service/category/toggle), ticket management actions (assign/status), archive management actions, and `<RouteProgress />` in `app/portal/layout.tsx` + `app/portal/admin/layout.tsx`.
- **Verification:** `npm run build` PASS, `npx tsc --noEmit` PASS, `npm run build:vinext` PASS, `npx vitest run` 16/16 PASS.

### Phase 7.4: Skeleton Loaders for Route Data Fetching (UX)
- **Status:** Completed
- **Why:** Data-driven portal pages rendered nothing until their server fetches finished, so navigation felt unresponsive. Design guidance taken from the `redesign-existing-projects` skill (loading states are Fix Priority #6) and `minimalist-ui` (opacity-only motion, theme-aware flat surfaces).
- **What was added (dependency-free, no npm packages):**
  - `components/ui/skeleton.tsx` - server-safe base `Skeleton` plus 5 compositions shaped to match each real page layout (dashboard, 7-col queue table, ticket detail, users table, 2-col services lists).
  - 6 route-level `loading.tsx` files (Next.js Suspense shells, auto-replaced when the page renders): `/portal`, `/portal/queue`, `/portal/queue/[id]`, `/portal/tickets/[id]`, `/portal/admin/users`, `/portal/admin/services`.
  - `app/globals.css` - `skeleton-pulse` keyframe (opacity only, no layout animation) with `prefers-reduced-motion: reduce` fallback (static, opacity 0.55).
- **Design constraints honored:** colors use theme variables (`--surface-muted` / `--border`) so light + dark mode both render correctly; skeletons pulse via opacity only; responsive `md:` breakpoints mirror each real page.
- **Deliberately skipped:** `/portal/request` (renders instantly) and `/portal/admin/archive` (client page, action-level loading already covered by Spinner) - a skeleton there would cause unnecessary flashing.
- **Verification:** `npm run build` PASS, `npx tsc --noEmit` PASS, `npm run build:vinext` PASS, `npx vitest run` 16/16 PASS. Auth flow, request submission, ticket queue/detail, and admin routes untouched.

### Phase 7.5: Conditional Confirmation-Resend on Sign-In (UX polish)
- **Status:** Completed
- **Root cause of the previous behavior:** the sign-in page displayed the "Did not receive a confirmation email? / Resend Confirmation Email" block statically for every visitor, regardless of whether they had an unconfirmed account.
- **Fix:**
  - `app/auth/actions.ts` - `signIn` detects Supabase `error.code === "email_not_confirmed"` and redirects to `/auth/sign-in?error=email_not_confirmed&email=<url-encoded-email>`. Every other error keeps the existing handling.
  - `app/auth/sign-in/page.tsx` - the friendly message "Please confirm your email address before signing in." and the resend block now render ONLY when `error === "email_not_confirmed"`. New visitors, wrong-password, and confirmed users never see the resend block. The resend form pre-fills the email and submits to the existing `resendConfirmation` action; the existing `confirmation_sent` message handling is unchanged.
- **Security preserved:** `/portal` stays protected, authentication is enforced server-side, email confirmation is untouched, and there are no RLS, schema, trigger, or ticket changes; no service-role key is exposed to the client.
- **Verification:** `npm run build` PASS, `npx tsc --noEmit` PASS, `npm run build:vinext` PASS, `npx vitest run` 23/23 PASS. Auth redirect-loop fixes, request submission, ticket queue/detail, and admin routes remain intact.

### Phase 7.6: Security Fix — C1 Profile Role-Escalation (CRITICAL)
- **Status:** Code + migration authored, awaiting SQL-Editor execution in production.
- **Root cause:** `public.profiles` had a table-level `UPDATE` grant for `authenticated` AND a self-service update RLS policy with no `WITH CHECK` restricting new values, so any authenticated user could `UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid()` and self-escalate (OWASP A01 / IDOR), defeating the role-based access control.
- **Fix:**
  - Revoke table-level `UPDATE` on `profiles` from `authenticated`.
  - Grant column-level `UPDATE` only on safe self-service fields (full_name, department, student_number, employee_id, phone, avatar_url). Clients can never write role / id / email / created_at / updated_at.
  - Added SECURITY DEFINER helpers `is_admin_or_manager()` (admin OR manager parity) and re-pointed the admin SELECT policy so `manager` keeps admin visibility.
  - Added sanctioned, guarded server function `admin_set_user_role(UUID, user_role)` — only an existing admin/manager may invoke it; non-privileged callers are rejected first.
  - Promoted the shared `update_updated_at_column` trigger helper to SECURITY DEFINER (pinned search_path) so profile self-service updates keep working without granting `updated_at`.
  - `app/portal/admin/users/actions.ts` `updateUser` now routes role changes exclusively through `admin_set_user_role` RPC and validates the role allow-list.
- **Migration to apply (run in Supabase SQL Editor):** `supabase/migrations/20260828_phase1_fix_profiles_role_escalation.sql`.
- **Verification:** `npm run build` PASS, `npx tsc --noEmit` PASS (source; only pre-existing `.next` cache noise), `npx vitest run` **27/27** PASS (incl. 4 new C1 guard tests), eslint clean on all touched files. No RLS disable, no service-role key, no auth-flow change, roles preserved.

### Phase 7.7: IT Queue Lifecycle Hardening (Status / Priority / Request-Info / Admin Nav)
- **Status:** Completed (audit + implementation; no DB changes required).
- **Audit finding:** The full staff-side ticket lifecycle already existed server-side (`app/portal/queue/actions.ts`, `ticket-rules.ts`) and the schema already supported everything (`ticket_status` enum, `ticket_priority` enum, `assigned_to`, `closed_at`, `ticket_status_history`, `ticket_messages`). Classification: B — backend complete, UI gaps.
- **Fixes:**
  - `app/portal/queue/[id]/ticket-management.tsx` rewritten to route ALL mutations through the hardened server actions (`assignTicket`, `updateTicketStatus`, `updateTicketPriority`, `addWorkRemark`, `requestMoreInfo`) instead of direct browser-side Supabase writes. Removed the hardcoded `old_status: "open"` history bug; the server now records the true previous status. `resolved` no longer sets `closed_at` (only `closed` does).
  - Added the missing **Priority** control (`low/normal/high/urgent` → `updateTicketPriority`) and the missing **Request More Information** control (public message + `waiting_for_user` transition; requester reply auto-returns via `requester_provide_info()` RPC).
  - Admin discoverability: added **IT Queue** link to `app/portal/admin/layout.tsx` sidebar (`StackIcon`) and re-pointed ticket stat cards / quick actions in `app/portal/admin/page.tsx` to `/portal/queue` instead of Reports.
  - `app/portal/queue/actions.ts` now calls `revalidatePath` for `/portal/queue`, `/portal/queue/[id]`, and `/portal/tickets/[id]` after every successful mutation; `app/portal/tickets/[id]/actions.ts` revalidates after requester replies.
  - `app/portal/queue/page.tsx`: fixed the queue list row link — ticket rows now open the staff management page `/portal/queue/[id]` instead of the requester view `/portal/tickets/[id]` (root cause of "staff can only reply").
  - Detail page (`app/portal/queue/[id]/page.tsx`): Conversation vs Internal Notes clearly separated; explicit "Unassigned" state; passes `currentPriority`.
  - **No delete functionality added** (intentional — audit trail preservation; no DELETE RLS policy exists and none was added). No new tables, statuses, or roles.
- **Verification:** `npm test` 31/31 PASS, `npx tsc --noEmit` PASS (source), eslint clean on touched files, `npm run build:vinext` PASS.

### Phase 7.8: Signed-In Profile Button (UserMenu)
- **Status:** Completed.
- **Work:**
  - New `components/UserMenu.tsx` — client dropdown showing the authenticated user's `profiles.full_name` (fallback: email local-part), with Dashboard link and Sign Out (reuses the existing `signOut` server action in `app/auth/actions.ts`; no duplicate auth logic).
  - `app/page.tsx`: signed-in visitors see UserMenu in the landing nav; signed-out visitors keep the Sign In link.
  - `app/portal/layout.tsx`: bare Sign Out form replaced by UserMenu; header profile query returns `full_name, email`.
  - Name hidden on very small screens (`hidden sm:inline`) to keep the nav compact.
- **Security:** display data comes from the server-side session/profile lookup, never client-supplied; no tokens/passwords exposed; no role, RLS, or auth-flow changes.
- **Verification:** tests 31/31 PASS, build PASS, eslint clean.

### Phase 7.9: Mobile Responsiveness Fixes
- **Status:** Completed (responsive-only scope; desktop unchanged).
- **Skill used:** `.agents/skills/redesign-existing-projects/SKILL.md` (existing stack, targeted changes, preserve functionality).
- **Fixes (4 files, className/JSX-layout only):**
  - `app/page.tsx` (CRITICAL): the Sign In / UserMenu auth area was inside the `hidden md:flex` nav container — mobile users had no way to sign in. Auth area is now always visible; anchor links remain desktop-only.
  - `app/portal/layout.tsx` (CRITICAL): portal header wrapped (`min-h-16 py-2 sm:h-16`, `flex-wrap`, `gap-x-3 sm:gap-4`, `px-4 sm:px-6`) — no horizontal overflow at 320–414px.
  - `app/portal/admin/layout.tsx` (CRITICAL): fixed `w-64` sidebar crushed admin content on phones; sidebar now becomes a full-width top bar on mobile (`flex-col md:flex-row`, horizontally scrollable link row) — unchanged on desktop.
  - `app/portal/request/request-form.tsx` (HIGH): footer buttons stack on mobile (`flex-col-reverse sm:flex-row`); Cancel `w-full sm:w-auto`.
  - Verified already-responsive (unchanged): IT Queue table, admin users/reports/archive/import tables (`overflow-x-auto`), queue detail grid, portal dashboard, sign-in page, UserMenu dropdown.
- **Verification:** `npx tsc --noEmit` PASS (source; only pre-existing `.next/types/validator.ts` noise), eslint clean on all 4 changed files (project-wide lint errors are pre-existing minified `dist/` bundle output — lint config does not exclude `dist`), `npm test` 31/31 PASS, `npm run build:vinext` PASS. Git diff: 4 files, 19 insertions / 15 deletions, zero logic changes.

### Phase 8: AI Assistant (Status: Implemented — see §8x below)
- [x] Foundation, knowledge base, retrieval, UI, security, tests implemented
- [ ] Requires manual Supabase migration + Cloudflare AI binding (see §8 documentation)

### Phase 8.1: AI Foundation
- **Status:** Implemented (repository-side). Binding requires cluster setup (see §Cloudflare).
- **Provider:** Cloudflare Workers AI, integrated into the existing Worker (no second Worker).
- **Model:** `@cf/meta/llama-3.1-8b-instruct-fast` (active non-deprecated fast variant on Workers AI; the older `llama-3.1-8b-instruct` slug is Deprecated per the model catalog). Overridable via the non-secret `AI_MODEL` wrangler var — no code change needed to adopt a newer model.
- **AI binding:** `ai.binding = "AI"` added to `wrangler.jsonc`; requires Cloudflare Dashboard/CLI approval before it is active in production.
- **Env capture:** vinext doesn't expose the Worker `env` to application code, so a thin custom entry `cloudflare/worker-entry.ts` captures `env` once per isolate (mirrored on globalThis via `utils/ai/env.ts`) and delegates to `vinext/server/fetch-handler` unchanged. No framework behavior is altered.
- **Abstraction:** `utils/ai/provider.ts` defines a tiny `ChatProvider` interface; `utils/ai/cloudflare-workers-ai.ts` implements it; `utils/ai/index.ts` is the composition root. Another provider can be added without touching routes/UI.
- **Secrets:** none in git/wrangler/source/browser. No `NEXT_PUBLIC_AI_*`. No service-role key, token, or binding ever reaches the client. `env` is server-only.

### Phase 8.2: Knowledge Base
- **Status:** Implemented (schema + admin UI authored). Requires applying the migration via Supabase SQL Editor.
- **Migration:** `supabase/migrations/20260830_phase8_knowledge_base.sql` — additive only. Creates `public.knowledge_articles` (`id, title, slug, content, service_id, category_id, keywords TEXT[], is_published, created_by, created_at, updated_at`), index + `updated_at` trigger (reuses existing `update_updated_at_column` helper).
- **RLS (never disabled):** authenticated can SELECT published only; admin/manager get full management via the existing `is_admin_or_manager()` SECURITY DEFINER helper; student/employee/it_staff have no write policies; anon gets no policies.
- **Admin management:** `/portal/admin/knowledge-base` (page + `knowledge-admin.tsx` + `actions.ts`). Search, create, edit, publish/unpublish, delete. Every action re-verifies admin/manager server-side (`requireAdminManager`) *and* is gated by RLS. Added to the admin sidebar.

### Phase 8.3: Knowledge Retrieval / RAG
- **Status:** Implemented.
- **Strategy:** simple keyword retrieval (`utils/ai/retrieval.ts`) — no vector infra. Only `is_published = true` articles are fetched (bounded candidate set) and ranked by keyword/title/content score in application code; top 3 sent to the model. Pure ranking functions are unit-tested independently of Supabase.
- **Flow:** user question → validate → retrieve published KB → build server-owned prompt (`utils/ai/prompt.ts`) → Workers AI → answer with optional source titles.

### Phase 8.4: AI Security
- **Status:** Implemented.
- **Endpoint:** `POST /api/assistant` — identity only from the Supabase session (401 if unauthenticated); role never trusted from the body; input validated/length-capped (`utils/ai/validation.ts`, incl. rejecting client-supplied `system` roles so the system prompt stays server-owned); per-user rate limiting (`utils/ai/rate-limit.ts`: 20/day rolling + 5s min interval; 429 with friendly message; never counted on failure); only published KB is sent as context; no cross-user data; never returns secrets/raw errors (friendly fallback + escalate to `/portal/request`).
- **Prompt injection:** system instructions are server-only constants (`utils/ai/prompt.ts`) that forbid fabricated UPHSD procedures, reveal of the prompt, action claims, and admin behavior; user messages are appended after system and treated as untrusted. The app (not the model) enforces every authorization/DB decision — the AI has no tools, no SQL, no ticket actions.
- **Privacy:** no conversation persistence (client-side state only).

### Phase 8.5: UI + Tests
- **UI:** `/portal/assistant` (+ `assistant-chat.tsx` client component), linked in the portal header. Uses the existing UPHSD design system: conversation area, busy state, error + Retry + Submit-a-Request fallback, clear button, empty/suggestion state, responsive, accessible labels, Enter-to-send, duplicate-submit guard. Consistently states it gives guidance only and cannot perform actions.
- **Testing:** `tests/unit/ai-assistant.test.ts` — validation, rate limiting, prompt construction/injection hardening, retrieval ranking, and the Workers AI provider with a MOCKED binding (no network). 24 new tests (55 total). Mocked AI only; no automated test depends on a live provider.

### Phase 8.6: AI Transparency & Privacy Hardening
- **AI disclosure:** Assistant labeled "AI Assistant" with a visible `role="note"` disclosure on `/portal/assistant` before first interaction ("You are interacting with an AI assistant. Responses are AI-generated and may require verification."), plus a persistent slim disclosure bar ("AI-generated responses — may require verification") + Privacy link inside the full chat and floating widget. Shared wording in `utils/ai/transparency.ts`.
- **Privacy notice:** `/portal/assistant/privacy` — plain-language notice (interacting with AI; what the assistant receives; why; no conversation storage; knowledge-base context; Cloudflare Workers AI provider; retention; controller; rights; contact; submit-an-IT-request). Organizational details (controller identity, DPO contact, retention schedules, legal bases, Cloudflare retention confirmation) are marked **[TO BE CONFIRMED BY UPHSD]** and are NOT invented.
- **Data minimization:** only the user's message + current conversation + short excerpts of *published* knowledge articles are sent to the AI. No passwords, tokens, cookies, other users' tickets, internal notes, or profile fields. No expansion of data access.
- **Conversation retention:** conversations are **not stored** (client-side state only); verified — no localStorage/sessionStorage/cookies/analytics in assistant client code.
- **Automated decision-making:** the assistant is informational only; it cannot approve/deny, change tickets, assign privileges, or make academic/employment decisions. No automated decision-making introduced.
- **Human escalation:** `/portal/request` remains the authoritative path (available in the chat UI, widget, error states, and privacy notice).
- **Accuracy:** system prompt updated to require the exact phrase "I don't have a verified UPHSD procedure for that." when knowledge lacks an official procedure.
- **Security preserved:** auth, server-side role checks, RLS, validation, rate limiting, prompt-injection hardening, and secret handling unchanged.
- **Testing:** `tests/unit/ai-transparency.test.ts` (11 tests) — disclosure wording, privacy notice content, no browser storage/tracking, no profile-data sent, accuracy phrase. 71 total tests.

### Phase 8 — Deployment requirements (DASHBOARD-STEPS REMAINING)
1. Apply `supabase/migrations/20260830_phase8_knowledge_base.sql` in the Supabase SQL Editor (idempotent, additive).
2. The `ai` binding already in `wrangler.jsonc` must be authorized on the Cloudflare account for the `uphsd-it-helpdesk` Worker (Dashboard → Worker → Settings → Bindings → AI, or `wrangler` CLI with account auth). This cannot be completed from the repository-only environment.
3. After merge, Cloudflare auto-builds `npm run build:vinext` and deploys. The model will only answer with grounding once at least one article is published via the admin Knowledge Base page.

### Phase 9: Office Computer & IT Equipment Asset Management
- **Goal:** Move the client's Excel-based "Office Computer Inventory" into the Admin Panel as an Asset Management / Inventory feature, reproducing the exact Excel structure.
- **Route:** `/portal/admin/assets` (list) + `/portal/admin/assets/[id]` (detail, transfer, movement history). Added "Assets" nav item to the Admin sidebar.
- **Excel fidelity:** 16 inventory columns exactly as in the client's sheet, in order — `Re, ICT Asset, Manufacturer, Model, Serial Number, Specification, Asset Number, Date Acquired, Name or ID of Accountable Personnel, Position of Accountable Personnel, Condition, Department / Office (Location), BLDG., Remarks, Domain Name, Computer Name`. The only removed fields are the two the client explicitly dropped: **PMS** and **Installed Sangfor**. No extra/renamed columns. Enforced by `tests/unit/asset-columns.test.ts`.
- **Database:** `supabase/migrations/20260831_phase9_asset_management.sql` (additive, idempotent).
  - `ict_assets` — the 16-column inventory (current state). Duplicate-protection unique indexes on `asset_number` and `serial_number` (case-insensitive, non-null).
  - `asset_movements` — separate movement/history table (never an inventory column). Preserves previous → new personnel/position/dept/BLDG, performed-by, timestamp; never overwritten.
  - RLS enabled: staff (`it_staff`/`admin`/`manager`) can SELECT; only `admin`/`manager` can INSERT/UPDATE/DELETE (`is_admin_or_manager()`).
  - **IMPORTANT — table grants:** explicit `GRANT SELECT`/`GRANT INSERT, UPDATE, DELETE` to `authenticated` are REQUIRED (otherwise "permission denied for table ict_assets"). Uses the same pattern as the Phase 8 knowledge-base migration.
- **Features:** server actions behind admin/manager authorization — list/search/filter (query + condition + department + BLDG), create/update/delete, transfer (records movement + updates current state), and Excel (SpreadsheetML `.xls`) + CSV exports with exactly the 16 columns and CSV formula-injection escaping.
- **Authorization:** admin layout role gate + each server action re-verifies admin/manager server-side; RLS as second layer. Students/employees have no access. No client-trusted roles; no secrets.
- **Tests:** `tests/unit/asset-columns.test.ts` (3 tests) — exact 16-column order, no PMS/Installed Sangfor. Total 71+ tests.
- **Deployment note:** migration must be applied in Supabase SQL Editor before the page works; `.xls` uses SpreadsheetML 2003 (no external dependency).

### Technical Debt
- [ ] Migrate `middleware.ts` to `proxy.ts` (Next.js 16 deprecation warning)
- [ ] Replace Picsum placeholder images with official UPHSD photography
- [x] Add unit tests for Supabase client helpers (`tests/unit/supabase-client.test.ts`: server client, browser client, middleware env-guard + getUser success/throw)
- [ ] Add integration tests for middleware
- [ ] Add attachments support (future)

---

## 7. Git History

```
1368b04 feat: Phase 7.5 conditional confirmation resend on sign-in
922d8df test: add supabase client unit tests
737fd06 feat: add skeleton loaders for portal data routes + docs
a2122a0 feat: add loading feedback (spinner, submit button, route progress) + docs
7d15b58 fix: resolve RLS recursion and table grants for public reads (auth root cause)
436f7af fix: allow request submission when profile row is missing; update PROJECT.md
6311c41 fix: break auth redirect loop when profile row is missing
4b7b816 fix: resolve auth redirect loop by consolidating Supabase middleware client
9fdf176 chore: add temporary auth email diagnostics for debugging
91115e1 fix: support PKCE code exchange in auth callback
2be53a6 fix: regenerate package-lock.json for Cloudflare build
ffb1495 fix: replace placeholder images with UPHSD campus images
19e1db9 docs: update PROJECT.md with Phase 7 testing and security details
b0239a6 test: add Phase 7 auth tests, security review, and remove temporary diagnostics
9f14c27 fix: resolve signup profile creation, confirmation flow, and sign-in diagnostics
93944f5 chore: add temporary sign-in diagnostics for production debugging
7d3c180 docs: standardize production deployment workflow and update README
3c9691d docs: update PROJECT.md with admin authorization and service-category fixes
f6e65fe fix: resolve service-category order syntax and empty results
f15599b fix: resolve admin authorization and portal caching
be979ec feat: implement service-category relationship and dynamic filtering (Phase 6.4)
6bf66ff fix: implement dependent service/category dropdowns in request form
c2af438 fix: harden production auth callbacks and seed default help desk data (Phase 6.3)
3a405e4 feat: implement phase 6.2 import/export and duplicate detection
299f1b6 feat: implement authentication and user onboarding (Phase 6.1)
ff41ef6 feat: implement phase 3 help desk portal foundation
fd77772 docs: update PROJECT.md with UPHSD rebrand and current state
93c9389 feat: align help desk with UPHSD branding
3a880b5 docs: update PROJECT.md with production fix and current state
9a3dbc8 fix: resolve production HTTP 500 by adding Supabase env vars to wrangler.jsonc
8a95396 feat: update landing page branding and audience
0f8a40b docs: add project documentation
028d0fe feat: add Supabase client helpers and session middleware
925ca48 feat: configure vinext for Cloudflare Workers deployment
2cc0b7c feat: initialize Next.js landing page with institutional design
69a9dda Initial commit
```

## 7.1 GitHub Development Workflow

The standard workflow for all future development. `main` is the production branch and is protected — **never push directly to `main`**. Always work on a feature/fix branch and merge via a Pull Request.

1. Start from the latest `main`:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Create a feature/fix branch:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/my-fix
   ```

3. Work on the feature using the coding agent.
   - The agent must work on the current feature branch.
   - Never push directly to `main`.
   - Do not force-push.
   - Do not reset/drop/recreate the database.
   - Do not expose secrets.

4. Review your changes:
   ```bash
   git status
   git diff
   ```

5. Run validation (all must pass before opening a PR):
   ```bash
   npm run lint          # ESLint
   npx tsc --noEmit      # strict TypeScript check
   npm test              # vitest unit tests
   npm run build:vinext  # Cloudflare/vinext build
   ```

6. Commit the changes:
   ```bash
   git add .
   git commit -m "feat: describe the change"
   ```

7. Push the feature branch:
   ```bash
   git push -u origin feat/my-feature
   ```

8. Create a GitHub Pull Request:
   - Base branch: `main`
   - Compare branch: your `feat/my-feature` (or `fix/...`) branch
   - Write a clear PR title and summary
   - Wait for the CI `validate` check to run
   - Make sure the required checks pass
   - Review and approve the PR if branch protection requires approval
   - Merge the PR into `main`

9. After merging:
   ```bash
   git checkout main
   git pull origin main
   ```

10. Optional branch cleanup (merge-first):
    ```bash
    git branch -d feat/my-feature
    git push origin --delete feat/my-feature
    ```

### Deployment flow

```
Feature branch
  -> Pull Request
  -> CI validation (validate job)
  -> Review / approval
  -> Merge into main
  -> Cloudflare detects the updated main branch
  -> Cloudflare builds (npm run build:vinext) and deploys
  -> Production website is updated
```

Production URL: `https://uphsd-it-helpdesk.rycanano.workers.dev/`

Cloudflare is configured to auto-build and deploy from the protected `main` branch. For normal changes, **do not manually deploy** — let the merge trigger the build. Only use a manual/emergency deployment (`npm run build:vinext && npm run deploy:vinext`, which requires `CLOUDFLARE_API_TOKEN`) when explicitly required.

## 7.2 Pull Request Checklist

- [ ] Started from the latest `main`
- [ ] Created a feature/fix branch
- [ ] Did not modify `main` directly
- [ ] Reviewed `git diff`
- [ ] Ran `npm run lint`
- [ ] Ran TypeScript check (`npx tsc --noEmit`)
- [ ] Ran tests (`npm test`)
- [ ] Ran Cloudflare/vinext build (`npm run build:vinext`)
- [ ] Committed the changes
- [ ] Pushed the feature branch
- [ ] Created a Pull Request targeting `main`
- [ ] CI `validate` check passed
- [ ] Reviewed the changes
- [ ] Merged the Pull Request
- [ ] Pulled the updated `main` branch locally
- [ ] Verified the production deployment

## 7.3 Coding Agent Git Rules

- Always inspect `PROJECT.md` before starting a task.
- Work on the current feature branch.
- Never push directly to `main`.
- Never force-push.
- Never reset/drop the database.
- Never disable authentication or RLS to make a feature work.
- Never expose Supabase service-role keys or other secrets.
- Run the project's validation commands before reporting completion.
- Clearly report files changed, tests run, and remaining issues.


---

## 8. Production Verification Checklist

- [x] Landing page loads
- [x] Navigation works
- [x] Authentication works
- [x] Protected routes work
- [x] Database schema created
- [ ] RLS policies tested with real data
- [ ] Ticket creation workflow tested end-to-end
- [x] IT workflow works
- [x] Admin workflow works (server-side authorization verified)
- [x] Status history works
- [ ] Evaluation works
- [ ] Notifications work
- [ ] Reports work
- [x] Export works
- [x] Archive works
- [x] Import works
- [x] Duplicate detection works
- [x] Production auth callback configured
- [x] Default services/categories seeded
- [x] Service-category relationship implemented
- [x] Dynamic category filtering implemented
- [x] Server-side service/category validation implemented
- [x] Admin authorization hardened with explicit error handling
- [x] Portal pages forced dynamic to prevent caching
- [x] Mobile layout works (320/375/390/414/768px verified; auth area, portal header, admin sidebar, request form fixed)
- [ ] Error states work
- [x] Unauthorized access is blocked
- [ ] No secrets are exposed
- [x] Production build succeeds
- [x] Cloudflare deployment configuration fixed
- [x] Cloudflare deployment verified
- [ ] Admin authorization fix deployed to production

---

## 9. Assumptions Made

1. **Cloudflare Workers + vinext** is the correct deployment path for full-stack Next.js 16
2. **Supabase** is the backend platform (authentication + PostgreSQL)
3. **Students are primary users** alongside employees
4. **Priority levels** are configurable (Low, Normal, High, Urgent)
5. **Service categories** are database-driven and configurable
6. **AI chatbot** is deferred to Phase 8
7. **Official UPHSD branding** includes maroon (#7C0000), white, gold (#FFB603), and dark text (#1A1A1A)
8. **Ticket number format:** `IT-YYYY-NNNNNN` (auto-generated by database trigger)
9. **Ticket statuses:** open, in_progress, waiting_for_user, resolved, closed
10. **Initial roles:** student, employee, it_staff, admin, manager
11. **Business hours:** Monday – Friday, 8:00 AM – 5:00 PM
12. **Self-registration** is enabled for students and employees only
13. **Email domain** is enforced: `@perpetual.edu.ph`

---

## 10. Unresolved Client Requirements

- Exact notification mechanism (in-app only for now)
- Exact priority levels (configurable: low, normal, high, urgent)
- Exact scheduling rules
- Exact meaning of "double entry" / duplicate detection behavior
- Exact report import format
- Exact export formats
- Whether IT staff assignment is required
- Exact manager permissions
- Whether attachments are required
- Whether AI chatbot is required for first release
- Official UPHSD procedures for password resets, email access, etc.

---

*Last updated: 2026-08-31*  
*Current phase: Phases 7.1-7.9 + Phase 8 (AI Assistant incl. Phase 8.6 transparency) + Phase 9 (Asset Management) complete (repository-side). 9: Admin-office computer inventory reproduced as `ict_assets` + `asset_movements` (RLS + explicit table grants) — `/portal/admin/assets`, transfers/movement history, Excel/CSV export. ACTION REQUIRED: apply migrations in Supabase SQL Editor (incl. 20260830_phase8_knowledge_base.sql and 20260831_phase9_asset_management.sql, which also grants table privileges on ict_assets/asset_movements) and authorize the AI binding on the Cloudflare account.*
