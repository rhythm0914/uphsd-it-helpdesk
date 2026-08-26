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
- `dist/client/` - Static assets
- `dist/server/` - Worker/server code

### Deployment Commands
```bash
npm run build:vinext   # Build for Cloudflare Workers
npm run deploy:vinext  # Deploy to Cloudflare Workers
```

### Deployment Prerequisite
- Set `CLOUDFLARE_API_TOKEN` environment variable before running `npm run deploy:vinext`
- Alternatively, deploy through the Cloudflare Dashboard using the GitHub integration

### Production Issue History
- **Issue:** Production returned HTTP 500 Internal Server Error
- **Root Cause:** Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) were not available in the Cloudflare Worker runtime
- **Why local build passed:** `.env.local` existed locally, so `vinext build` could read the vars at build time
- **Why Cloudflare runtime failed:** The deployed Worker had no `vars` configuration. The generated `dist/server/wrangler.json` had `"vars": {}`
- **Fix:** Added the public Supabase vars to `wrangler.jsonc` under `[vars]`, which flows through to the generated `dist/server/wrangler.json` and the deployed Worker
- **Additional fix:** Added defensive error handling in `utils/supabase/middleware.ts` so missing env vars don't crash the entire site
- **Additional hardening:** Wrapped entire middleware in try/catch to prevent any unhandled exception from causing site-wide 500

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

### Phase 7: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Authorization tests
- [ ] Security review

### Phase 8: AI Assistant (Optional)
- [ ] Only after core system is stable

### Technical Debt
- [ ] Migrate `middleware.ts` to `proxy.ts` (Next.js 16 deprecation warning)
- [ ] Replace Picsum placeholder images with official UPHSD photography
- [ ] Add unit tests for Supabase client helpers
- [ ] Add integration tests for middleware
- [ ] Add attachments support (future)

---

## 7. Git History

```
(uncommitted) Phase 6.2: Import/Export & Duplicate Detection
(uncommitted) Phase 6: Authentication & User Onboarding
(uncommitted) Phase 5: Administrator Dashboard
(uncommitted) Phase 4: IT Staff Queue & Ticket Management
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
- [x] Admin workflow works
- [x] Status history works
- [ ] Evaluation works
- [ ] Notifications work
- [ ] Reports work
- [x] Export works
- [x] Archive works
- [x] Import works
- [x] Duplicate detection works
- [ ] Mobile layout works
- [ ] Error states work
- [ ] Unauthorized access is blocked
- [ ] No secrets are exposed
- [x] Production build succeeds
- [x] Cloudflare deployment configuration fixed
- [x] Cloudflare deployment verified

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

*Last updated: 2026-08-27*  
*Current phase: Phase 6.2 complete, preparing for Phase 7*
