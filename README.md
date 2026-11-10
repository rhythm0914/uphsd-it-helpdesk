# UPHSD IT Help Desk

A ticket system for the University of Perpetual Help System DALTA, used by
students and employees to request IT support and by IT staff to resolve it.

Production: <https://uphsd-it-helpdesk.rycanano.workers.dev/>

---

## What it does

A requester signs in with a UPHSD account, submits a request, and then follows
one request through its whole life. A technician picks it up, can ask for more
information, and marks it resolved with a short note. **The technician cannot
close it.** The requester decides: "Fix works" (which requires a 1-5 rating and
closes it as Verified Fixed) or "Still broken" (which reopens the same request,
same ID, with a fresh clock and a new work cycle).

If the requester goes quiet, the system sends one reminder after 3 days and
closes the request as **No Response** after 5 — a closure reason that is
deliberately excluded from resolution metrics, because a request nobody
answered is not a fix.

Every state change is written by one database function, so the workflow holds
even if someone bypasses the UI.

---

## Roles

| Role | Can do |
|---|---|
| `student` | Submit requests, reply, verify a fix, reopen. The only role you can create yourself. |
| `employee` | Same as student. Granted by an administrator. |
| `it_staff` | The queue, triage, assignment, requesting information, resolving, rejecting, internal notes. |
| `manager` | Everything `it_staff` can, plus the admin area. |
| `admin` | Everything, plus user management, services, imports, knowledge base, assets. |

`supervisor` is **not** a role. A supervisor is a staff account with
`profiles.staff_title = 'supervisor'` (and optionally `is_on_call`). It is who
escalations are sent to. Making it a separate enum value would have produced a
console whose actions the state machine rejects; a duty title keeps full acting
rights.

Public sign-up creates `student` accounts only. A submitted `role` field is
ignored server-side, so a crafted form cannot create an employee or a
technician.

---

## Ticket lifecycle

Statuses are stored in Postgres and labelled once in
`utils/tickets/constants.ts`:

| Stored value | Label |
|---|---|
| `open` | Open |
| `in_progress` | Assigned / In Progress |
| `waiting_for_user` | Awaiting Student |
| `resolved` | Resolved (pending your verification) |
| `closed` | Closed |
| `reopened` | Reopened |
| `rejected` | Rejected |

### Transition table

The only legal moves. `utils/tickets/constants.ts` is the source of truth and
`public.transition_ticket()` enforces the same rules in the database.

| Action | From | To | Who |
|---|---|---|---|
| `assign` | Open, Assigned / In Progress, Reopened | Assigned / In Progress | staff |
| `start_work` | Open, Reopened | Assigned / In Progress | staff |
| `request_info` | Open, Assigned / In Progress, Reopened | Awaiting Student | staff |
| `student_reply` | Awaiting Student | Open if unassigned, else Assigned / In Progress | requester |
| `resolve` | Open, Assigned / In Progress, Reopened | Resolved | staff |
| `reject` | Open, Assigned / In Progress, Awaiting Student, Reopened | Rejected | staff |
| `verify_fixed` | Resolved | Closed (Verified Fixed) | requester |
| `report_still_broken` | Resolved | Reopened | requester |
| `acknowledge_reopen` | Reopened | Assigned / In Progress | staff |
| `close_no_response` | Resolved, Awaiting Student | Closed (No Response) | system only |

`Closed` and `Rejected` are terminal. A staff member has no path to `closed` at
all: `verify_fixed` is requester-only and `close_no_response` requires the
service role.

### Why it cannot be bypassed

- `transition_ticket()` is `SECURITY DEFINER`, reads the actor's role from
  `profiles`, and validates every transition and payload itself.
- `UPDATE` on `tickets` was revoked from `authenticated` and re-granted only on
  columns staff legitimately edit (`subject`, `description`, `priority`,
  `assigned_to`, `service_id`, `category_id`, `updated_at`). `status` and the
  closure columns are writable only by the function.
- The server action (`app/portal/tickets/transition.ts`) is a friendly pre-check
  that produces precise error messages. It is not the security boundary.

---

## Service targets

| Priority | First response | Resolution |
|---|---|---|
| Urgent | 4 hours, 24/7 | 1 business day |
| High | 1 business day | 3 business days |
| Normal | 2 business days | 5 business days |
| Low | 3 business days | 7 business days |

Business hours are Monday-Friday, 08:00-17:00 Asia/Manila. The Philippines has
no daylight saving time, so the offset is a fixed +08:00 and no timezone library
is needed. Urgent is the only target measured on a wall clock: a blocked defense
cannot wait for Monday morning.

**These targets are placeholders from the brief and are not yet confirmed by the
owner.** Change them in `utils/tickets/sla.ts` and in the matching CASE in
`supabase/schema.sql` (`set_ticket_sla`, and the escalation pass).

### Urgent path

Choosing Urgent opens a required acknowledgement and a required explanation,
both enforced in `submitRequest`, not just in the form. The justification is
shown to staff on the ticket. Escalation levels: 1 = reopened more than once,
2 = first-response target passed, 3 = resolution target passed; each level
notifies the supervisor once.

---

## Notifications and automation

In-app notifications are the base channel (`public.notifications`, inbox at
`/portal/notifications`, unread count in the portal header). A trigger on
`ticket_status_history` writes them inside the same transaction as the
transition, so "the requester was notified" is true rather than best-effort.

**Email channel (optional).** Email delivery is available behind a
provider-agnostic notifier interface (`utils/notifications/`). When
`RESEND_API_KEY` is set as a Worker secret, the following transitions also send
email: Resolved → verify request, 3-day reminder, Awaiting Student request,
Rejection, Reopened (to technician), and Escalation/Urgent alerts (to
Supervisor/on-call). Delivery attempts are logged in
`public.notification_delivery` (channel, status, error). Email never blocks a
ticket transition: if the key is missing or the provider fails, a warning is
logged and in-app remains the only channel.

**Without `RESEND_API_KEY`**, email is disabled with a console warning and the
system is in-app only — exactly the behavior before this channel was added.

An hourly cron (`triggers.crons = ["0 * * * *"]`) calls the `scheduled()` export
in `cloudflare/worker-entry.ts`, which invokes two Postgres functions:

- `run_no_response_job()` — reminder at 3 days, close at 5.
- `run_sla_escalation()` — refreshes SLA health and escalates.

Both are `SECURITY DEFINER`, reject callers that are not `service_role`, run in
one transaction, and are idempotent, so a replayed cron cannot double-close or
double-notify. `scheduled()` is a Cloudflare Worker cron handler and cannot be
invoked via a public HTTP fetch route.

**Cutover guard.** The no-response job ignores tickets whose waiting period began
before `2026-11-11T00:00:00Z`. Phase 1 migrated every legacy staff-closed ticket
to Resolved, so without the guard the first run would have re-closed the entire
historical backlog.

**Requires a secret.** `SUPABASE_SERVICE_ROLE_KEY` must be set on the Worker
(`wrangler secret put SUPABASE_SERVICE_ROLE_KEY`). Without it `scheduled()`
reports "skipped" and the site keeps working; the automation simply does not run.

`RESEND_API_KEY` is optional (`wrangler secret put RESEND_API_KEY`). Without it,
email notifications are skipped with a warning; in-app only is used.

---

## Routes

| Route | Access |
|---|---|
| `/` | Public landing page |
| `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/update-password`, `/auth/callback` | Public |
| `/portal` | Any signed-in user |
| `/portal/request` | Signed-in, confirmed email |
| `/portal/track` | Signed-in; only your own requests |
| `/portal/tickets/[id]` | Owner (RLS) or staff |
| `/portal/notifications` | Signed-in; only your own |
| `/portal/assistant` | Signed-in (AI assistant) |
| `/portal/queue`, `/portal/queue/[id]` | `it_staff`, `admin`, `manager` |
| `/portal/admin/*` | `admin`, `manager` |

`middleware.ts` protects `/portal/*` and preserves the intended destination
through sign-in via a validated `next` parameter. Every staff/admin page
re-checks the role server-side; hiding a nav link is never the control.

---

## Getting started

```bash
npm ci
cp .env.example .env.local   # then fill in the values
npm run dev
```

### Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public
and also set in `wrangler.jsonc` so the Worker has them at runtime. The service
role key is **never** committed; it is a Worker secret only.

### Database

`supabase/schema.sql` is the entire database — types, tables, indexes, row-level
security policies, functions and triggers — in dependency order. Paste it into
the Supabase SQL Editor (or run `psql -f`) once. It is written to be safe to run
twice, so a failed attempt is recovered by running it again.

**New project:** that one file is all you need.

**Existing project:** run `supabase/upgrade/add_enum_values.sql` on its own
first, then `schema.sql`. The enum values must commit in their own transaction,
because Postgres will not let one transaction add a value and then use it.
`schema.sql` stops with a message telling you this if you forget.

Two optional files, neither of which ever runs automatically:

- `supabase/verify/alignment_checks.sql` — read-only invariants. Run it after
  creating or upgrading; every row should read `PASS`.
- `supabase/one-off/retire_legacy_tickets.sql` — closes the pre-2026 backlog with
  the `administrative_closure` reason. Preview the count it prints before running
  it. Until it runs, those tickets stay in requesters' "please verify" list,
  because the no-response job deliberately ignores anything dated before the
  cutover.

Verification: `npm run verify:sql` applies `schema.sql` to a real Postgres
(PGlite, in-process) twice, seeds rows an existing installation already holds,
and asserts the workflow rules — grants, the state machine, the no-response job,
retirement, SLA maths and escalation. No Supabase project or credentials needed.

The migration chain this file was consolidated from is no longer in the working
tree; it stays in git history (`git show 2892ebd:supabase/migrations`) if you
need to see why a particular rule exists.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Next.js production build |
| `npm run build:vinext` | Cloudflare Workers build (what CI and production use) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm test` | Vitest unit tests |
| `npm run verify:sql` | Apply schema.sql to embedded Postgres and check behaviour |
| `npm run test:e2e` | Playwright E2E tests against a seeded Supabase project |

CI (`.github/workflows/ci.yml`) runs `npm ci` → lint → `build:vinext` → `tsc` →
`npm test` → `npm run verify:sql`.

---

## Deployment

Push to `main`; Cloudflare builds and deploys the Worker automatically. For an
emergency manual deploy, `npm run build:vinext && npm run deploy:vinext` (needs
`CLOUDFLARE_API_TOKEN`).

Deploy order still matters where code depends on SQL: apply `schema.sql` (and
the upgrade file, on an existing project) **before** the code that calls it goes
live. The application calls `transition_ticket()`, `run_no_response_job()` and
`run_sla_escalation()`; until those exist, ticket actions fail with "function
does not exist" even though the pages render.

---

## Project structure

```
app/
  auth/                 sign-in, sign-up, password reset, PKCE callback
  portal/
    request/            new-request form + server action
    tickets/[id]/       requester ticket view, reply, verification
    track/              Track Request (ID lookup + my requests)
    notifications/      in-app inbox
    queue/              IT staff queue and ticket management
    admin/              users, services, reports, archive, import, knowledge base, assets
    assistant/          AI assistant pages
  api/                  assistant + service-categories route handlers
cloudflare/
  worker-entry.ts       Worker entry: captures env, fetch + scheduled
components/             UI primitives, ticket components, chat widget
utils/
  tickets/constants.ts  THE workflow source of truth
  tickets/sla.ts        SLA targets and due dates
  business-hours.ts     Asia/Manila working-time maths
  jobs/                 no-response rules + scheduled runner
  auth/email-domain.ts  institutional domain check
  supabase/             server/client/middleware clients
supabase/
  schema.sql            the whole database (see Database above)
  upgrade/              one enum step for existing projects
  one-off/              optional data cleanups
  verify/               read-only verification queries
tests/unit/             Vitest
docs/
  ALIGNMENT_AUDIT.md    pre-work audit
  CHANGELOG_ALIGNMENT.md decision log
```

---

## End-to-end tests

Playwright E2E tests live in `tests/e2e/`. They exercise the full ticket
workflow through the browser: sign-up, request submission, staff triage,
verification, rejection, and data isolation.

### Prerequisites

The tests require a **seeded Supabase project** with:

| User | Email | Role |
|------|-------|------|
| Student A | `E2E_STUDENT_A_EMAIL` | student |
| Student B | `E2E_STUDENT_B_EMAIL` | student |
| Staff | `E2E_STAFF_EMAIL` | it_staff / admin / manager |

Plus active `services` and `ticket_categories` rows (the seed data inserted by
`supabase/schema.sql` covers this).

Set these environment variables before running:

```bash
export E2E_STUDENT_A_EMAIL=studentA@perpetual.edu.ph
export E2E_STUDENT_A_PASSWORD=password123
export E2E_STUDENT_B_EMAIL=studentB@perpetual.edu.ph
export E2E_STUDENT_B_PASSWORD=password123
export E2E_STAFF_EMAIL=staff@perpetual.edu.ph
export E2E_STAFF_PASSWORD=password123
```

### Running

```bash
npm run test:e2e
```

This starts `npm run dev` and runs the Playwright suite against
`http://localhost:3000`. Set `PLAYWRIGHT_BASE_URL` to test against a deployed
preview or production URL instead.

### CI

The CI workflow (`.github/workflows/ci.yml`) runs the E2E tests when all six
`E2E_*` secrets are configured. Without them, the E2E job is skipped.

## Known limitations

- **Email is optional.** Reminders and escalations are in-app by default; email
  delivery works only when `RESEND_API_KEY` is set as a Worker secret. Without it,
  email is skipped with a warning and in-app only is used.
- **SLA targets are unconfirmed placeholders.** They can now be managed by
  admins in the SLA Policies admin page (`/portal/admin/sla-policies`), stored
  in `public.sla_policies`, with code falling back to the built-in constants.
- **The cron needs `SUPABASE_SERVICE_ROLE_KEY`** to do anything.
- **The SQL is reviewed, not proven.** It has not been executed against a live
  Postgres by an automated test.
- **Supabase "Confirm email"** must be enabled for the confirmed-email gate to
  matter; this is a dashboard setting, not repository code.
- **On-call** is a boolean duty flag, not a shift roster.
- The AI assistant is separate from the ticket workflow and never changes ticket
  state.

## Changes since the paper

The system has been aligned beyond the project paper in these areas (see
`docs/PAPER_CORRECTIONS.md`):

- **Priorities** are `Urgent / High / Medium / Low` (paper said "Normal"; code
  used "normal" internally until Phase 15).
- **Urgent handling** adds supervisor verification/downgrade, on-call alert
  24/7, and business-hours skip.
- **Manual escalation** lets any staff member escalate to the supervisor with a
  reason; escalations are audit-logged.
- **Reopen diagnosis** records the cause (wrong credentials, account lockout,
  account sync, other) when a reopened ticket is acknowledged.
- **KPI recording** adds first-response time, SLA compliance rate, escalations,
  reopens, and satisfaction rating to the Supervisor report page.
- **System-wide audit log** records role changes, user deactivation, imports,
  SLA changes, on-call changes, manual escalations, and urgent verification.
- **AI knowledge base** has published articles matching the current workflow.
- **Duplicate warning** on the request form when the same user has an open
  ticket with the same service/category in the last 24h (non-blocking).
- **Student cancel** closes a request as `Cancelled by requester` while Open or
  Awaiting Student.
- **Privacy consent** checkbox at sign-up; accounts are deactivated, not deleted.
- **Password recovery** uses Supabase Auth email flow only (no security
  questions), with non-enumerating responses, per-email/IP rate limiting, and
  admin-assisted recovery for lost mailboxes.
- **Closure type** is exposed as a derived view (`public.ticket_closure_types`)
  mapping status + closure_reason to Verified Fixed / No Response / Rejected /
  Cancelled by requester.

See `docs/CHANGELOG_ALIGNMENT.md` for the reasoning behind each decision.

---

## Deploy order (do not execute against production)

1. **Backup** the existing Supabase project (`vrnkzglwzwojrxlpofss`) and export current `public.tickets`, `public.profiles`, `public.ticket_status_history`.
2. **Apply `supabase/upgrade/add_enum_values.sql` on its own** to the staging Supabase project (must commit in its own transaction; Postgres cannot add an enum value and use it in the same transaction).
3. **Apply `supabase/schema.sql`** (idempotent, safe to re-run).
4. **Apply `supabase/upgrade/backfill_normal_to_medium.sql`** (converts existing `normal` tickets to `medium`; runs after schema.sql so `medium` is committed).
5. **Run `npm run verify:sql`** against staging — all invariants must PASS.
5. **Run `npm run verify:sql -- --mutation-test`** — the verifier corrupts three invariants on purpose and must fail, proving the checks cannot quietly stop checking anything.
6. **Set Worker secrets** (never commit these):
   - `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
   - `wrangler secret put RESEND_API_KEY` (optional; without it, email is skipped with a warning, in-app only)
7. **Deploy the Worker:** `npm run build:vinext && npm run deploy:vinext`
8. **Confirm cron trigger** is active in the Cloudflare dashboard (`0 * * * *`).
9. **Supabase dashboard settings:**
   - Authentication → Settings: Enable email confirmations (ON)
   - Authentication → URL Configuration: Site URL and redirect URLs include `https://uphsd-it-helpdesk.rycanano.workers.dev/auth/callback`
   - SMTP: configured if email notifications are desired
10. **Smoke tests** (see below).

## Manual smoke-test script

Run these against the deployed URL after deploy. Each step should produce the
stated result.

### 1. Auth

| Step | Expected result |
|------|----------------|
| Sign up with `studentA@perpetual.edu.ph` | Account created, redirect to sign-in with "check_email" message |
| Sign up with `attacker@gmail.com` | Rejected with domain error |
| Sign up with `user@perpetual.edu.ph.evil.com` | Rejected (exact domain match only) |
| Leave the Privacy Notice checkbox unchecked | Rejected with consent error |
| Sign in with confirmed credentials | Redirected to `/portal` |

### 2. Ticket workflow (requester)

| Step | Expected result |
|------|----------------|
| Submit a new request | Receives `IT-YYYY-NNNNNN` tracking number; status Open |
| Track at `/portal/track` (requires sign-in) | Sees the request in the list |
| IT marks resolved | Receives "Verify your request" in-app notification |
| Choose "Fix works" + rating 1-5 | Ticket closes as Closed (Verified Fixed) |
| Choose "Still broken" + reason | Ticket reopens with the same ID |

### 3. Ticket workflow (staff)

| Step | Expected result |
|------|----------------|
| Assign a technician | Ticket moves to Assigned / In Progress |
| Resolve with a note | Ticket moves to Resolved (staff cannot close directly) |
| Request more information | Ticket moves to Awaiting Student |
| Reject with reason | Ticket moves to Rejected (terminal) |
| Verify an urgent request | Urgency verified; supervisor notified |
| Downgrade an urgent request | Returns to normal queue; requester notified |
| Escalate a ticket with a reason | Escalation logged; supervisor notified |
| Cancel a request (Open or Awaiting Student) | Ticket closes as Cancelled by requester |

### 4. Automation (cron)

| Step | Expected result |
|------|----------------|
| Wait for the hourly cron to fire | `run_no_response_job` sends reminders at 3 days, closes at 5 |
| Replay the cron | No ticket is touched twice (idempotent) |
| Worker logs | `[scheduled] maintenance pass completed: ...` |

### 5. Email (if `RESEND_API_KEY` is configured)

| Step | Expected result |
|------|----------------|
| Check `public.notification_delivery` | Rows with `channel = 'email'`, `status = 'sent'` |
| Temporarily unset `RESEND_API_KEY` | Email skipped with warning; in-app only; transitions still work |

### 6. Data isolation

| Step | Expected result |
|------|----------------|
| Student A opens Student B's ticket by URL | "Ticket Not Found" |
| Student A tracks Student B's ticket ID | "No request with that ID belongs to your account" |

### 7. Admin

| Step | Expected result |
|------|----------------|
| Open `/portal/admin/audit-log` | Lists role changes, imports, escalations, urgent verification |
| Open `/portal/admin/sla-policies` | Lists priorities with response/resolution targets; editable |
| Open `/portal/admin/reports` | Shows KPI cards: total tickets, avg resolution, first response, SLA compliance, escalations, reopens, avg rating |

