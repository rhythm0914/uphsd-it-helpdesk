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

---

## 3. Current File Structure

```
app/
  favicon.ico
  globals.css
  layout.tsx
  page.tsx
middleware.ts
utils/
  supabase/
    client.ts
    middleware.ts
    server.ts
public/
  file.svg
  globe.svg
  next.svg
  vercel.svg
  window.svg
vite.config.ts
wrangler.jsonc
next.config.ts
package.json
tsconfig.json
.env.example
.env.local (gitignored)
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
- `wrangler.jsonc` - Cloudflare Workers configuration

### Build Output
- `dist/client/` - Static assets
- `dist/server/` - Worker/server code

### Deployment Commands
```bash
npm run build:vinext   # Build for Cloudflare Workers
npm run deploy:vinext  # Deploy to Cloudflare Workers
```

---

## 6. Current Known Issues / TODOs

### Landing Page
- [ ] Update copy to include students as primary audience
- [ ] Remove fake operational metrics (147 requests, 2.4 days, 4.6/5, 8 staff)
- [ ] Replace Picsum placeholder images with appropriate imagery
- [ ] Apply official UPHSD branding colors (maroon, white, blue, gold)
- [ ] Add official UPHSD logo/seal assets if publicly available
- [ ] Update navigation to include Knowledge Base / FAQ

### Phase 3: Student/Employee Portal
- [ ] Create Supabase database schema
- [ ] Implement authentication (login/logout)
- [ ] Create role-based access control
- [ ] Build student/employee dashboard
- [ ] Implement request creation form
- [ ] Implement request tracking
- [ ] Add request ID generation (IT-YYYY-NNNNNN)
- [ ] Create knowledge base structure
- [ ] Implement notifications foundation
- [ ] Implement evaluation system

### Phase 4: IT Staff Dashboard
- [ ] Build IT request queue
- [ ] Add filters, search, sorting
- [ ] Implement request assignment
- [ ] Add status updates and work remarks
- [ ] Implement completion workflow

### Phase 5: Administrator Dashboard
- [ ] User management
- [ ] Department management
- [ ] Service category management
- [ ] Reports with real database data
- [ ] Analytics
- [ ] Archiving
- [ ] Import/export

### Phase 6: Import/Export & Duplicate Detection
- [ ] CSV export
- [ ] Report export
- [ ] Controlled import with validation
- [ ] Duplicate request detection

### Phase 7: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Authorization tests
- [ ] Security review

### Phase 8: AI Assistant (Optional)
- [ ] Only after core system is stable

---

## 7. Git History

```
028d0fe feat: add Supabase client helpers and session middleware
925ca48 feat: configure vinext for Cloudflare Workers deployment
2cc0b7c feat: initialize Next.js landing page with institutional design
69a9dda Initial commit
```

---

## 8. Production Verification Checklist

- [x] Landing page loads
- [x] Navigation works
- [ ] Authentication works
- [ ] Protected routes work
- [ ] Database connection works
- [ ] RLS works
- [ ] Employee workflow works
- [ ] IT workflow works
- [ ] Admin workflow works
- [ ] Status history works
- [ ] Evaluation works
- [ ] Notifications work
- [ ] Reports work
- [ ] Export works
- [ ] Archive works
- [ ] Mobile layout works
- [ ] Error states work
- [ ] Unauthorized access is blocked
- [ ] No secrets are exposed
- [x] Production build succeeds
- [ ] Cloudflare deployment succeeds

---

## 9. Assumptions Made

1. **Cloudflare Workers + vinext** is the correct deployment path for full-stack Next.js 16
2. **Supabase** is the backend platform (authentication + PostgreSQL)
3. **Students are primary users** alongside employees
4. **Priority levels** are configurable (Low, Normal, High, Urgent) but not yet confirmed
5. **Service categories** are database-driven and configurable
6. **AI chatbot** is deferred to Phase 8
7. **Official UPHSD branding** includes maroon, white, blue, and gold
8. **Request ID format:** `IT-YYYY-NNNNNN` (example)
9. **Initial statuses:** Pending, In Progress, Completed, Cancelled
10. **Initial roles:** student, employee, it_staff, admin, manager

---

## 10. Unresolved Client Requirements

- Exact notification mechanism (in-app only for now)
- Exact priority levels (configurable, not yet confirmed)
- Exact scheduling rules
- Exact meaning of "double entry" / duplicate detection behavior
- Exact report import format
- Exact export formats
- Whether employees self-register
- Whether school email is mandatory
- Whether IT staff assignment is required
- Exact manager permissions
- Whether attachments are required
- Whether AI chatbot is required for first release
- Official UPHSD procedures for password resets, email access, etc.

---

*Last updated: 2026-08-26*  
*Current phase: Phase 2.6 complete, preparing for Phase 3*
