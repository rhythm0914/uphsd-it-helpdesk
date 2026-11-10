# BPMN Alignment Audit — UPHSD IT Help Desk

**Phase:** 0 (read-only audit, no source edits)
**Date:** 2026-11-10
**Branch audited:** `main` @ `750f5a5`
**Scope:** Alignment of the current help desk system with the BPMN student IT-help-desk
process defined in `MASTER_PROMPT.md`.
**Method:** Static reading of the repository only. No database was queried, no
migration was run, nothing was deployed. Anything that can only be confirmed
against the live Supabase project or the Cloudflare dashboard is marked
**TODO (unverified)** rather than assumed.

---

## 1. Tech stack and platform configuration

| Area | Current state | Evidence |
|---|---|---|
| Framework | Next.js **16.3.3**, App Router, React 19.2.8, TypeScript 5 | `package.json` |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | `package.json`, `postcss.config.mjs` |
| Hosting | Cloudflare Workers via **vinext** (`vinext ^1.0.0-beta.8`, `@vinext/cloudflare`) | `package.json`, `vite.config.ts` |
| Worker entry | Custom `cloudflare/worker-entry.ts` captures `env` once per isolate, then delegates to `vinext/server/fetch-handler`. **Fetch only — no `scheduled()` handler.** | `cloudflare/worker-entry.ts` |
| Worker config | `name: uphsd-it-helpdesk`, `compatibility_date: 2026-08-26`, `nodejs_compat`, assets `dist/client`, `ai.binding: AI`, cache enabled | `wrangler.jsonc` |
| Cron triggers | **None.** No `triggers.crons` block in `wrangler.jsonc`. No queue consumers. | `wrangler.jsonc` |
| Database | Supabase Postgres (project `vrnkzglwzwojrxlpofss`), accessed through PostgREST | `wrangler.jsonc` vars, `utils/supabase/*` |
| ORM | **None.** Direct `@supabase/supabase-js` queries from Server Components, Server Actions and two route handlers. No Prisma/Drizzle/Kysely. | `utils/supabase/server.ts`, `utils/supabase/client.ts` |
| Auth | Supabase Auth (email + password), cookie sessions, PKCE callback | `app/auth/actions.ts`, `app/auth/callback/route.ts`, `utils/supabase/middleware.ts` |
| Role storage | `public.profiles.role`, enum `public.user_role` = `student, employee, it_staff, admin, manager`. Mirrored into `auth.users.user_metadata.role` at sign-up. | `supabase/schema.sql:7`, `app/auth/actions.ts`, `types/database.ts:5` |
| Role mutation | Column-level grants + guarded `admin_set_user_role()` SECURITY DEFINER RPC (C1 escalation fix) | `supabase/migrations/20260828_phase1_fix_profiles_role_escalation.sql`, `supabase/schema.sql` |
| Route guards | `middleware.ts` protects `/portal/*` only; every admin/queue page additionally re-checks the role server-side | `middleware.ts:22-35`, `app/portal/admin/layout.tsx`, `app/portal/queue/[id]/page.tsx` |
| Email provider | **None configured.** The only outbound mail is Supabase Auth's built-in confirmation / recovery mail. No Resend/SendGrid/MailChannels/nodemailer dependency, no worker binding. | `package.json`, `wrangler.jsonc`, no matches for mail SDKs |
| In-app notifications | **None.** No notifications table, no unread state, no bell UI. | no table in `supabase/schema.sql` |
| Tests | Vitest (unit, 8 files) + Playwright (auth e2e). No test touches ticket workflow. | `vitest.config.ts`, `tests/unit/*`, `tests/e2e/auth.spec.ts` |
| CI | `npm ci` → lint → `build:vinext` → `tsc --noEmit` → `npm test` | `.github/workflows/ci.yml` |

Notable platform consequence: **there is currently no scheduling mechanism at all**
and **no notification channel beyond Supabase's auth mail**. Phases 4 and 5 both
depend on a scheduler; Phase 2/3/5 all depend on a notifier. Both must be built,
not extended.

---

## 2. Ticket data model and every place status values appear

### 2.1 Tables (current)

| Table | Columns | Evidence |
|---|---|---|
| `profiles` | `id, email, full_name, role, department, student_number, employee_id, phone, avatar_url, created_at, updated_at` | `supabase/schema.sql` profiles block |
| `services` | `id, name, description, is_active, created_at, updated_at` | same |
| `ticket_categories` | `id, name, description, is_active, created_at, updated_at` | same |
| `service_categories` | junction: service ↔ category | `supabase/schema.sql` |
| `tickets` | `id, ticket_number, requester_id, assigned_to, service_id, category_id, subject, description, priority, status, created_at, updated_at, closed_at` | `supabase/schema.sql:62` (`status`), `:65` (`closed_at`) |
| `ticket_status_history` | `id, ticket_id, old_status, new_status, changed_by, notes, created_at` | `supabase/schema.sql:69-77` |
| `ticket_messages` | `id, ticket_id, sender_id, message, is_internal, created_at` | `supabase/schema.sql:79-87` |
| `knowledge_articles` | Phase 8 AI KB | `supabase/migrations/20260830_phase8_knowledge_base.sql` |
| `ict_assets`, `asset_movements` | Phase 9 inventory | `supabase/migrations/20260831_phase9_asset_management.sql` |

### 2.2 Enums (current)

```sql
CREATE TYPE public.ticket_status  AS ENUM ('open','in_progress','waiting_for_user','resolved','closed');   -- schema.sql:11
CREATE TYPE public.ticket_priority AS ENUM ('low','normal','high','urgent');                                -- schema.sql:14
```

**Every ticket field the target model needs and does not have:**
`closure_reason`, `rejection_reason`, `reopened_count`, `resolved_at`,
`awaiting_student_since`, `reminder_sent_at`, `sla_started_at`,
`response_due_at`, `resolve_due_at`, `sla_status`, `escalated_at/level`,
`requester_pool` (student vs employee reporting separation), and any
satisfaction-rating storage (no table, no column, no `evaluation` table anywhere).

### 2.3 Where status strings live (all of them)

| Layer | Location | What it holds |
|---|---|---|
| DB | `supabase/schema.sql:11` | enum definition |
| DB | `supabase/schema.sql:62` | column + `DEFAULT 'open'` |
| DB | `supabase/schema.sql:69-77` | history table enum FKs |
| DB | `supabase/schema.sql` `requester_provide_info()` (~`:325-365`, transitions at `:350`, `:355`) | `waiting_for_user` → `in_progress` |
| DB | `supabase/migrations/20260829_phase1_ticket_workflow_reply_and_rls.sql` | same RPC + staff-only history policy |
| Types | `types/database.ts:22-27` | `TicketStatus` union |
| Rules | `app/portal/queue/ticket-rules.ts:8-14` | `ALLOWED_STATUSES` |
| Rules | `app/portal/queue/ticket-rules.ts:26-32` | `ALLOWED_TRANSITIONS` map |
| Server actions | `app/portal/queue/actions.ts` | `assignTicket` hard-codes `in_progress`; `updateTicketStatus` writes any allowed status and sets `closed_at` when `status === "closed"` |
| Server actions | `app/portal/tickets/[id]/actions.ts` | `"waiting_for_user"` comparison + `requester_provide_info` RPC call |
| UI (staff) | `app/portal/queue/[id]/ticket-management.tsx` | free status dropdown over all 5 values |
| UI (staff) | `app/portal/queue/page.tsx`, `app/portal/queue/lib.ts:44-45` | status filter |
| UI (requester) | `app/portal/tickets/[id]/page.tsx` | `getStatusColor()` switch, `waiting_for_user` banner, `status !== "closed"` reply gate |
| UI (requester) | `app/portal/page.tsx` | dashboard counts for `open` / `in_progress` / `resolved` |
| UI (admin) | `app/portal/admin/page.tsx:51-52` | Open / Resolved stat cards |
| UI (admin) | `app/portal/admin/reports/page.tsx:8-14` | `statusColors` map |
| Reports | `app/portal/admin/reports/actions.ts` | avg resolution computed from `status = 'closed'` + `closed_at` |
| Import | `app/portal/admin/import/actions.ts`, `import-management.tsx` | validates/accepts `status` column |
| Export | `app/portal/admin/archive/actions.ts` | exports `status` column |
| Public copy | `app/page.tsx:361` | "submitted, pending, in progress, and completed" (**values that do not exist in the DB**) |
| Public copy | `app/page.tsx:72-75` | step 04 "Complete and evaluate" |
| Public copy | `app/page.tsx` tracking card | static mock badge "In Progress" |
| AI | `utils/ai/prompt.ts`, `utils/ai/retrieval.ts` | must be checked for status wording when labels change |

The strings are **not** in one shared module. `ticket-rules.ts` is the closest
thing to a single source of truth for the allow-list, but the type union in
`types/database.ts`, the DB enum, and every colour/badge/filter map duplicate
the values independently. Phase 1 must collapse these.

---

## 3. Capability inventory

| Capability | Exists? | Where / what is missing |
|---|---|---|
| Technician "mark resolved" | **Partial** | Reachable only through the generic staff status dropdown (`ticket-management.tsx` → `updateTicketStatus`). No dedicated action, no required resolution note. |
| Block staff from closing | **No** | `ALLOWED_TRANSITIONS` grants `→ closed` from `open`, `in_progress`, `waiting_for_user`, `resolved` (`ticket-rules.ts:30-34`), and `updateTicketStatus` writes `closed_at`. Staff can close today. |
| Student verification (Fix works) | **No** | No action, no button, no transition reserved to the requester. |
| "Still broken" / reopen | **Partial** | Transitions `resolved → open/in_progress` and `closed → open/in_progress` exist in `ticket-rules.ts`, but only staff can invoke them (requester has no UPDATE policy on `tickets`). No requester UI, no `reopened_count`, no SLA restart, no technician notification. |
| Satisfaction rating | **No** | No table, no column, no UI. Only aspirational copy (`app/page.tsx:74`, `:102`). |
| Needs more information | **Partial** | `requestMoreInfo()` inserts a public message and moves to `waiting_for_user`; `requester_provide_info()` (SECURITY DEFINER) returns it to `in_progress` and audits it. Missing: `awaiting_student_since`, return to `open` when unassigned (always goes to `in_progress`), notification. |
| Reject with reason | **No** | No `rejected` status, no `rejection_reason`, no staff action, no requester display, no terminal-state handling. |
| SLA fields / timers | **No** | None of the SLA columns exist. |
| Escalation to Supervisor | **No** | **No `supervisor` role** in `user_role` (`schema.sql:7`). No escalation logic, no escalation view. |
| Priority | **Partial** | Enum exists; staff can set it (`updateTicketPriority`); requesters can already pick `urgent` freely from the request form. No gating question, no justification, no audit of misuse. |
| Urgent path | **No** | No 24/7 clock, no supervisor/on-call alert, no queue pinning, no bypass of business-hours wait. |
| Business-hours logic | **No** | No `addBusinessTime` / `isWithinBusinessHours` helper anywhere. Copy claims Mon–Fri 8–5 (`app/page.tsx:92`, `:437`, `:487`) but no code enforces or computes with it. |
| Scheduled jobs | **No** | No cron triggers, no `scheduled()` export, no job code. |
| Notifications / reminders | **No** | No channel. No email binding, no in-app notification store. |
| Audit history | **Partial** | `ticket_status_history` records `old_status, new_status, changed_by, notes, created_at`. Missing `role`, `reason` (structured), and any non-status audit events (priority change, rejection, reminder sent, escalation). |
| Track Request page | **No** | No `/portal/track` route. Portal routes are `admin, assistant, queue, request, tickets` only. Landing FAQ tells users to use it (`app/page.tsx:95-98`). |
| "My Requests" list | **No** | The dashboard shows counts and recent tickets; there is no dedicated list page. |

---

## 4. Routing, authentication and ownership

### 4.1 Route protection

- `middleware.ts` redirects unauthenticated `/portal/*` requests to
  `/auth/sign-in?next=…` using `getValidatedReturnTo()` (open-redirect safe) —
  `middleware.ts:22-35`, `utils/authorization.ts`.
- Authenticated users are bounced away from `/auth/sign-in|sign-up|forgot-password`
  (but **not** `/auth/update-password`, intentionally) — `middleware.ts:44-49`.
- `/api/service-categories` is **unprotected** (public read of active
  service/category names). Low risk; noted for completeness.
- `/api/assistant` calls `supabase.auth.getUser()` — `app/api/assistant/route.ts:50`.
- Admin: `app/portal/admin/layout.tsx` re-checks `role !== 'admin' && role !== 'manager'`.
- Queue: `app/portal/queue/[id]/page.tsx` re-checks
  `role !== 'it_staff' && role !== 'admin' && role !== 'manager'`.
- Staff mutations: every action in `app/portal/queue/actions.ts` begins with
  `requireStaff()`, which re-reads the profile role server-side.

### 4.2 Ticket ownership

Two layers, both server-side:

1. **RLS** — `"Users can view their own tickets"` allows
   `requester_id = auth.uid()` OR a staff/admin/manager role
   (`supabase/schema.sql` tickets policies). Requesters have **no** UPDATE policy
   on `tickets`; only staff/admin/manager do.
2. **Page guard** — `app/portal/tickets/[id]/page.tsx` queries by id and, on
   `error || !ticket`, renders "Ticket Not Found … does not exist or you do not
   have permission" — the same response for both cases, so the ID's existence is
   not leaked.

**Gap:** `"IT staff and admins can update tickets"` has `USING` but **no
`WITH CHECK`**, and grants no column restriction — staff can write any column on
any ticket (including `requester_id`). It is not exploitable by a requester, but
it is broader than the process needs and should be narrowed when the transition
function lands.

### 4.3 How a requester looks up a ticket today

They cannot search by Request ID. They reach a ticket only by clicking it from
the dashboard's recent list, which is built from
`tickets.requester_id = auth.uid()`. There is **no ID-entry lookup**, which is
exactly what the target Track Request page must add.

---

## 5. Sign-up policy

| Question | Answer | Evidence |
|---|---|---|
| Is `@perpetual.edu.ph` enforced server-side? | **Yes**, in the `signUp` server action — not only UI text. | `app/auth/actions.ts:70` |
| Is the match exact/case-insensitive? | **Partially.** It uses `email.endsWith("@perpetual.edu.ph")`. Lookalikes such as `x@perpetual.edu.ph.evil.com` and `x@sub.perpetual.edu.ph` are correctly rejected, but the check is **case-sensitive**, so `Juan@Perpetual.EDU.PH` is wrongly rejected, and the domain is a **string literal** rather than a config constant. | `app/auth/actions.ts:70` |
| Can a user self-select Employee? | **Yes.** The sign-up form offers Student/Employee and the action accepts both. Contradicts the target (admin-granted roles). | `app/auth/sign-up/page.tsx` (Account Type select), `app/auth/actions.ts` (`allowedRoles = ["student","employee"]`) |
| Is there email verification? | **Partially.** Supabase confirmation mail is sent, `/auth/callback` completes the PKCE exchange, and sign-in special-cases `email_not_confirmed`. But **no application code verifies `email_confirmed_at` before allowing ticket submission** — `submitRequest()` only requires a session. Enforcement therefore depends on the Supabase project's "Confirm email" setting. | `app/auth/actions.ts`, `app/auth/callback/route.ts`, `app/portal/request/actions.ts` |
| Any domain rule for employees/staff? | None. Admin creates staff users with `email_confirm: true` via the service-role client. | `app/portal/admin/users/actions.ts` |

**TODO (unverified):** whether the hosted Supabase project has "Confirm email"
enabled. This cannot be read from the repository.

---

## 6. Public copy inventory (contradictions to fix in Phase 7)

| Location | Current text | Problem |
|---|---|---|
| `app/page.tsx:72-75` | Step 04 "Complete and evaluate" — "Requestors confirm resolution and submit a short satisfaction rating." | No such evaluation flow exists. |
| `app/page.tsx:361` | "Students and employees see **submitted, pending, in progress, and completed** stages." | These status values do not exist; the DB uses `open/in_progress/waiting_for_user/resolved/closed`. |
| `app/page.tsx:100-103` | FAQ "What happens after my request is completed?" → "submit a short evaluation" | Describes a removed/nonexistent feature. |
| `app/page.tsx:95-98` | FAQ "How do I track my request?" → "Use the **Track Request page** with your Request ID" | **The page does not exist.** |
| `app/page.tsx` tracking card | Static mock showing badge "In Progress" | Should show Resolved + Fix works / Still broken. |
| `app/page.tsx:92` | FAQ business hours: Mon–Fri 8–5, "processed on the next business day" | Says nothing about urgent 24/7. |
| `app/page.tsx:504` | Footer: "UPHSD IT Help Desk. **Internal use only.**" | Contradicts a public student/employee service. |
| `app/layout.tsx:17` | Meta description: "…for students and employees…" | Fine, but must match the final status/verification wording. |
| `app/page.tsx` (hero/CTA/footer) | "students and employees" used consistently | Keep, but must state employees share the same flow and that sign-up needs a UPHSD email. |
| Emails | Supabase default templates only | No status names in templates today; Phase 7 should confirm they stay neutral or update them. |

Missing FAQ topics: what if the problem comes back, what if IT needs more
information, why was my request rejected, what if I don't respond, what counts
as urgent.

---

## 7. Existing README state

`README.md` is **materially outdated**:

- Describes roles as `student, employee, it_staff, admin, manager` but not what
  each may do, and does not mention that technicians cannot close.
- Documents the ticket lifecycle as nowhere — no status table at all.
- No mention of verification, reopen, rejection, SLA, business hours, timers,
  urgent path, audit history, or Track Request.
- Deployment section says Cloudflare auto-deploys on push to `main` (matches
  `PROJECT.md`); CI also exists but is not documented.
- Environment variables list `NEXT_PUBLIC_SUPABASE_KEY`, but the code and
  `.env.example` use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — **wrong variable
  name**.
- Project structure section omits `app/portal/assistant`, `admin/assets`,
  `admin/knowledge-base`, `cloudflare/`, `tests/`, `supabase/migrations/`,
  `utils/ai/`.
- No test, lint, or type-check commands in the "Scripts" table (they exist in
  `package.json`).
- `README_UPDATE.md` is the correct target template and should replace it in
  Phase 8.

`PROJECT.md` is a phase-by-phase engineering log, accurate through Phase 9, and
should be left as history (README replaces it as the front door).

---

## 8. Requirements scorecard

Status legend: **Done** = implemented and enforced server-side · **Partial** =
some layers exist, at least one required layer missing · **Missing** = nothing.

| # | Requirement | Status | Evidence / what is missing |
|---|---|---|---|
| 1 | Verification flow (technician resolves, requester confirms) | **Partial** | A `resolved` status exists (`schema.sql:11`) and staff can set it (`ticket-rules.ts`, `queue/actions.ts`), and `resolved` no longer sets `closed_at`. Missing: a dedicated "Mark as Resolved" action with a required resolution note, any requester "Fix works" action, and **the guarantee that staff cannot close** — `ALLOWED_TRANSITIONS` still allows `→ closed` from four states (`ticket-rules.ts:30-34`). |
| 2 | "Still broken" reopen on the same ticket ID | **Partial** | `resolved → open/in_progress` and `closed → open/in_progress` transitions exist (`ticket-rules.ts:31-32`), but only staff can trigger them; requesters have no UPDATE policy on `tickets`. Missing: requester action, `reopened_count`, SLA restart, technician notification, queue prioritisation. |
| 3 | No-response handling (3-day reminder, 5-day No Response close) | **Missing** | No cron triggers (`wrangler.jsonc`), no `scheduled()` in `cloudflare/worker-entry.ts`, no reminder/auto-close fields, no job code, no notification channel. |
| 4 | Target status list in one shared module | **Missing** | DB enum still the old 5 (`schema.sql:11`); labels duplicated across `types/database.ts:22-27`, `ticket-rules.ts:8-14`, five UI colour maps, reports, import, export. No `closure_reason` / `rejection_reason`. |
| 5 | Urgent path | **Partial** | `urgent` exists as a `ticket_priority` value and staff can set it (`updateTicketPriority`); requesters can already select it directly from the request form. Missing: the gated "Is this urgent?" question + help text + misuse audit, 24/7 clock, supervisor/on-call alert, queue pinning, business-hours bypass. |
| 6 | Needs-info and rejection | **Partial** | Needs-info works end-to-end (`requestMoreInfo` + public message + `waiting_for_user`; `requester_provide_info()` returns to `in_progress` with an audited transition). Missing: `awaiting_student_since`, return to `open` when unassigned, notification, and **all of rejection** (no `rejected` status, no reason field, no action, no requester display, no terminal handling). |
| 7 | Escalation and SLA | **Missing** | No SLA columns, no business-hours helper, **no `supervisor` role**, no escalation job, no escalation view, no at-risk/breached surfacing. |
| 8 | Track Request page + login decision | **Missing** | No `/portal/track` route, no "My Requests" page, no ID lookup. Ownership is already correct (RLS + uniform "Not Found"), and the post-login `next=` redirect works (`middleware.ts`, `getValidatedReturnTo`). Public copy points at a page that does not exist (`app/page.tsx:95-98`). |
| 9 | Wording consistency + UPHSD-only sign-up | **Partial** | Domain is enforced **server-side** (`app/auth/actions.ts:70`) but case-sensitive and hard-coded; Employee is still self-selectable; five public copy statements contradict real behaviour (see §6); footer says "Internal use only". |

**Score: 0 Done, 5 Partial, 4 Missing.**

---

## 9. Phase plan

Each phase is scoped so it can land as one reviewable branch. Migrations are
additive-first; nothing is deployed from the agent.

### Phase 1 — Status model, state machine, audit log
- **Files:** new `lib/tickets/status.ts` (or `utils/tickets/constants.ts`) as the
  single source for statuses, labels, allowed transitions, closure/rejection
  reasons, priorities; refactor `types/database.ts`, `app/portal/queue/ticket-rules.ts`,
  all colour/filter maps, reports, import, export to consume it.
- **Migration:** new enum values + new columns (`closure_reason`,
  `rejection_reason`, `reopened_count`, `resolved_at`, `closed_at` semantics,
  `awaiting_student_since`); backfill mapping; **update the
  `requester_provide_info()` RPC in the same migration** so a stale
  SECURITY DEFINER function cannot drive an illegal transition.
- **Single entry point:** `transitionTicket(ticketId, action, actor, payload)`.
  Open decision: implement as a `SECURITY DEFINER` RPC (keeps enforcement under
  RLS and works for requesters who have no UPDATE policy) versus a server action
  with role checks. **Recommendation: RPC**, with the server action as a thin
  wrapper. Must be decided before writing code.
- **Tests:** every allowed transition, every forbidden transition, each role.

### Phase 2 — Verification, Still broken, rating
- Requires Phase 1's transition function.
- New requester actions on `/portal/tickets/[id]`: "Fix works" (+ required rating,
  atomic close) and "Still broken" (+ required reason, reopen same ID).
- Remove all staff `→ closed` paths; "Mark as Resolved" with required note.
- Needs a **notifier** (in-app at minimum). Email is blocked on a provider
  decision — see open questions.

### Phase 3 — Needs-info and rejection
- Extend `requestMoreInfo` with `awaiting_student_since`; return to `open` when
  unassigned.
- New staff "Reject" action with preset + free-text reason; `rejected` terminal
  UI for requester and staff; "Submit a new request" CTA.

### Phase 4 — No-response job
- Add `triggers.crons` to `wrangler.jsonc` **and** a `scheduled()` export in
  `cloudflare/worker-entry.ts` (verify vinext's handler contract first).
- Idempotent job keyed on `reminder_sent_at`; system actor rows in history.
- Must not count No Response as a verified fix in reports/exports.

### Phase 5 — Urgent, business hours, SLA, escalation
- New `utils/business-hours.ts` (Asia/Manila, no dependency unless justified).
- SLA columns + config module; urgent gating question + audit; supervisor role +
  on-call concept; escalation pass in the same scheduled job.

### Phase 6 — Access, roles, Track Request
- `/portal/track` (+ "My Requests"), ownership-safe lookup, `next=` return.
- Domain in config; case-insensitive normalisation; admin-granted Employee;
  confirmation-before-submit check.
- IDOR sweep of every route/action.

### Phase 7 — Public copy
- Rewrite step 04, tracking copy and card, FAQ (incl. 5 new questions), footer,
  metadata; keep "students and employees" consistent.

### Phase 8 — README + changelog + QA
- Replace `README.md` from `README_UPDATE.md`; add
  `docs/CHANGELOG_ALIGNMENT.md`; run lint/tsc/tests/build; write the manual E2E
  script and the deploy order.

---

## 10. Risks

1. **Enum migration is not trivially reversible.** Postgres cannot rename or drop
   enum labels; `ALTER TYPE … ADD VALUE` also cannot run inside a transaction
   block on older servers. Plan: add new labels additively, keep the old ones
   until a follow-up cleanup migration, and store the human-facing label in the
   shared constants module rather than the DB where possible.
2. **Backfilling `closed` is ambiguous.** Today `closed` means "staff closed it";
   no confirmation artefact exists anywhere. Per the target mapping, the honest
   result for every existing `closed` row is **Resolved**, not "Closed (Verified
   Fixed)". `closed_at` is also used by `app/portal/admin/reports/actions.ts` for
   average resolution time — that calculation must be redefined against
   `resolved_at`/`closed_at` + `closure_reason`, or the metric silently changes.
3. **`requester_provide_info()` is SECURITY DEFINER.** If Phase 1 changes the
   status set without updating this function, a requester can still force an
   old transition that the new state machine forbids. It must ship in the same
   migration.
4. **Requesters have no UPDATE policy on `tickets`.** Any requester-side
   transition (verify, reopen) must go through a guarded `SECURITY DEFINER` RPC
   or a server action using a privileged client. Choosing "server action with the
   anon client" will silently fail on RLS. Decide before Phase 2.
5. **No scheduler exists.** Phase 4/5 need a cron trigger *and* a `scheduled()`
   handler that vinext currently does not have. This is new platform surface and
   needs verification on a preview Worker, not just a local build.
6. **No notification channel exists.** "Notify the requester / technician /
   supervisor" is currently impossible in-app (no table) and by email (no
   provider). Phases 2–5 all assume notifications; the smallest compliant
   implementation is an in-app notifications table, with email as a later add.
   This must be agreed before Phase 2, or those phases deliver transitions
   without notifications.
7. **Import/export will break with the new statuses.** `app/portal/admin/import`
   validates a `status` column and `archive/actions.ts` exports one; both must be
   updated in the same phase as the status change or operators will ingest
   values the enum rejects.
8. **Staff-side regressions.** Removing staff `→ closed` and the free-form status
   dropdown changes a workflow people are using today. Expect the queue UI,
   filters and admin stat cards to need coordinated updates.
9. **Timezone.** Workers run UTC; "Mon–Fri 08:00–17:00 Asia/Manila" needs explicit
   offset handling (no DST in PH, which helps). Tests must pin the clock.
10. **Two "source of truth" files already exist** (`ticket-rules.ts` and
    `types/database.ts`). Introducing a third without deleting the others would
    make the duplication worse; the refactor must collapse them.
11. **Supabase email confirmation is unverified.** If the hosted project has it
    disabled, "email verification required before submitting" (Phase 6) is a
    behaviour change that depends on dashboard configuration, not code alone.

---

## 11. Open questions for the owner

1. **SLA targets** are placeholders in the brief (Urgent 4h/1BD, High 1BD/3BD,
   Normal 2BD/5BD). Confirm before Phase 5 writes them into config.
2. **Notifier:** in-app only, or add a transactional email provider (e.g. Resend)
   for verification requests, reminders and escalations? Email is a new
   dependency **and** a new external service plus API key — needs a decision and
   a key before Phase 2/4/5 can notify by mail.
3. **On-call roster:** does one exist, or should Phase 5 add an admin-managed
   on-call list/role?
4. **3-day / 5-day rule for `Awaiting Student`:** the brief flags this as an
   assumption. Confirm it applies (or only to `Resolved`).
5. **Employee role:** confirm that Employee becomes admin-granted (no
   self-selection) and that employees are reported separately via a pool field.
6. **Existing `closed` tickets:** confirm the backfill to **Resolved** (no
   confirmation artefact exists today), versus leaving them closed with a
   `legacy` closure reason.
7. **Supervisor role:** confirm adding `supervisor` to `user_role` (currently
    absent) rather than reusing `manager`.
8. **Supabase "Confirm email" setting** on the hosted project — needs a dashboard
   check; not visible from the repository.

---

## 12. What was not checked

- No database connection was made; RLS was read from SQL sources, not executed.
- No Cloudflare account access; cron/queue/VPC capabilities were read from
  `wrangler.jsonc` only.
- No Supabase dashboard access; email-confirmation and redirect-URL settings are
  **unverified**.
- No runtime exercise of the app; the audit is static.
