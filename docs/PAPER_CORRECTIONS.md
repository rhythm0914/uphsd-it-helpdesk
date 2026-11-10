# PAPER CORRECTIONS

Items in the project paper ("UPHSD IT Help Desk", Sections 1-24) that no longer
match the implemented system. Basis: the code in this repository as of Phases
0-16. The project team should edit the paper to reflect these.

---

## Section 1 — System scope

**Paper says:** "The system is primarily for students."
**System says:** The landing page and sign-up serve "students and employees."
**Correction:** Reword Section 1 to say the system serves students and employees, with students self-registering and employees granted accounts by administrators.

---

## Section 13 — Data model

**Paper says:** `user_id INT` and a `password` column in application tables.
**System has:** `id UUID` referencing Supabase Auth (`auth.users`), with no password column in any application table. Passwords are managed exclusively by Supabase Auth.
**Correction:** Replace INT `user_id` with UUID referencing `auth.users.id`; remove the `password` column; document that Supabase Auth owns credentials.

**Paper says:** REQUEST/SLA fields include `reminder`, `escalation`, `closure` fields that differ from the real schema.
**System has:** `priority` values `low/medium/high/urgent` (not `normal`), `status` values `open/in_progress/waiting_for_user/resolved/closed/reopened/rejected`, `closure_reason` values `verified_fixed/no_response/rejected/cancelled_by_requester`, plus `first_response_at`, `escalation_level`, `escalated_at`, `reopened_count`, `reopen_cause`, `reopen_cause_note`, `urgent_verified_at`, `urgent_verified_by`, `priority_justification`.
**Correction:** Update the data model diagrams and field definitions to match the actual schema in `supabase/schema.sql` and `types/database.ts`.

**Paper says:** `Rejected` is a `closure_type`, not a standalone status.
**System has:** `rejected` is a standalone terminal status with its own `rejection_reason`/`rejection_category` columns. A derived `closure_type` view (`public.ticket_closure_types`) maps status + closure_reason to `verified_fixed` / `no_response` / `rejected` / `cancelled_by_requester`.
**Correction:** Document that `rejected` is implemented as a status, with `closure_type` exposed as a derived view for reports and exports.

---

## Section 13 / 16 — Scheduled jobs

**Paper says:** The service-role key is never used.
**System has:** The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is used as a Worker secret to invoke `run_no_response_job()` and `run_sla_escalation()` via Cloudflare Cron Triggers. The key is never in the repository or client code.
**Correction:** Reword to say the key is used only as a Worker secret for cron-triggered maintenance passes, never stored in the repository or client bundle.

---

## Section 13 / 16 — Testing

**Paper says:** Testing descriptions are outdated (TC-002 repeats TC-001's title; "Actual Result" says "To be recorded"; Section 19 is missing).
**System has:** 841 unit tests across 16 test files covering: state machine (704 cases), business hours/SLA, authorization behavior, authorization rules, ticket rejection, ticket queue order, ticket state machine, AI assistant transparency, AI responses, asset columns, format date, duplicate request detection, rate limiting, notification channel, security profile guard.
**Correction:** Update the testing section to describe unit tests (Vitest), RLS tests (implicit in state machine tests), E2E tests (Playwright in `tests/e2e/`), and the SQL verifier (`scripts/verify-sql.mjs` with mutation testing).

---

## Section 18 — Roles

**Paper says:** "Five roles" but lists only four (student, IT staff, administrator, manager); the figure also shows "employee."
**System has:** Five roles: `student`, `employee`, `it_staff`, `admin`, `manager`. `supervisor` is not a role but a duty title (`profiles.staff_title = 'supervisor'`).
**Correction:** Reconcile Section 13 text, the role table, and the figure: list all five roles and explain that `supervisor` is a staff title, not a separate role.

---

## Section 20 — Test cases

**Paper says:** TC-002 repeats TC-001's title; "Actual Result" column says "To be recorded" while Status says "Done"; Section 19 is missing (numbering jumps from 18 to 20).
**System has:** Test cases are implemented as automated unit tests, not a manual table.
**Correction:** Renumber sections, fix TC-002's title to "Invalid credentials," and replace "To be recorded" with actual results from the test suite.

---

## Section 21 — Deployment

**Paper says:** Generic deployment on a campus server/web server.
**System has:** Next.js 16 (vinext) on Cloudflare Workers, Supabase (Auth, Postgres, RLS), Cloudflare Workers AI assistant, Cloudflare Cron Triggers for scheduled maintenance.
**Correction:** Update Section 21 to describe the actual stack: Cloudflare Workers + Supabase, with Wrangler for deployment and Supabase for the database and auth.

---

## Spelling corrections

- "Adminsitrator" → "Administrator" (use case table)
- "AUTHENTHICATION" → "AUTHENTICATION"
- "DEPLYOMENT" → "DEPLOYMENT"
- "AMD REQUEST" → "AND REQUEST" (Section 7.2)

---

## Notifications

**Paper says:** Confirmation/reminder wording implies email delivery.
**System has:** Notifications are in-app only unless `RESEND_API_KEY` is configured as a Worker secret. Email is optional and never blocks a ticket transition.
**Correction:** Update the confirmation/reminder wording to say "in-app notification (and email if configured)."
