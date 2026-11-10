# BPMN Alignment — Changelog

This records the work that aligned the UPHSD IT Help Desk with the BPMN
student IT-help-desk process, phase by phase. It is a decision log as much as a
change log: the reason a thing was built this way matters more than the diff.

Nothing here was deployed from the agent, and no migration was executed against
production. The database is now delivered as a single `supabase/schema.sql`; see "Schema
delivery" at the bottom.

---

## Phase 0 — Audit (read-only)

`docs/ALIGNMENT_AUDIT.md`.

Score at the start: **0 of 9 requirements done, 5 partial, 4 missing**. The two
structural gaps were that staff could close a ticket directly and that the
system had no scheduler and no notification channel at all.

---

## Phase 1 — Status model, state machine, audit trail

**Problem.** `tickets.status` was writable by any staff client through
PostgREST, and the staff UI exposed a free-form status dropdown that included
Closed. Five separate copies of the status list existed (the type union, an
allow-list file, five colour maps, reports, import/export).

**What changed.**

- `utils/tickets/constants.ts` is now the only place a status, label, action,
  closure reason, rejection category or priority is named. Badge classes, filter
  options and import validation all read from it. `app/portal/queue/ticket-rules.ts`
  was deleted.
- `supabase/migrations/20261110_01_add_ticket_status_values.sql` adds the
  `reopened` and `rejected` enum values.
- `supabase/migrations/20261110_02_phase1_ticket_state_machine.sql` adds the
  workflow columns, structured audit columns (`actor_role`, `reason`), the
  `ticket_feedback` table, and `public.transition_ticket()`.
- `app/portal/tickets/transition.ts` is the single server action; every staff and
  requester action delegates to it.
- Direct client writes on `tickets.status` were revoked, and the UPDATE policy
  gained a `WITH CHECK`. A hand-crafted PostgREST request cannot move a ticket.

**Decision: the enforcement point is a `SECURITY DEFINER` RPC, not the server
action.** Requesters have no UPDATE policy on `tickets`, so a server action
running as the requester would fail on RLS. The RPC validates the actor from
`profiles.role` and `auth.uid()` inside the database, and the server action is a
fast, friendly pre-check.

**Decision: legacy `closed` rows became `resolved`.** No requester confirmation
artefact exists for tickets staff closed under the old workflow, so labelling
them "Closed (Verified Fixed)" would have manufactured a rating nobody gave.
Each migration wrote an audit row explaining it.

**Consequence to manage.** Those migrated tickets are now Resolved, so the
no-response job would have touched them. Phase 4 adds a cutover guard for
exactly this.

---

## Phase 2 — Verification, rating, notifications, work cycles

**What changed.**

- Requester "Fix works" (rating 1-5 required, atomic close as Verified Fixed)
  and "Still broken" (reason required, reopens the same ticket).
- `supabase/migrations/20261111_01_phase2_notifications_and_cycles.sql` adds
  `notifications`, `ticket_cycles`, `current_cycle`, `sla_started_at`, and a
  trigger on `ticket_status_history` that writes both.
- `app/portal/notifications` is the in-app inbox; the portal header shows an
  unread count.
- Reopening starts a new cycle and restarts the SLA clock.

**Decision: notifications are in-app only.** The project has no email provider
configured, and adding one is a new external service plus a key. Every phase
that says "notify" is satisfied by the in-app inbox; email remains a documented
follow-up. The trigger fires inside the same transaction as the transition,
which is what makes "the requester was notified" true rather than best-effort.

---

## Phase 3 — Needs-info and rejection

- `request_info` records `awaiting_student_since`; a requester reply returns the
  ticket to Open when nobody was assigned, otherwise to Assigned / In Progress.
- `reject` requires a reason and stores a preset category plus free text.
  Rejected is terminal: no action leaves it, and the requester sees the category,
  the explanation, and a link to submit a new request.

---

## Phase 4 — No-response automation

**What changed.**

- `wrangler.jsonc` gains `triggers.crons = ["0 * * * *"]` (hourly, on the hour).
- `cloudflare/worker-entry.ts` gains a `scheduled()` handler that calls
  `runScheduledJobs()`. The handler is additive; `fetch` is unchanged.
- `supabase/migrations/20261111_03_phase4_no_response.sql` adds
  `reminder_sent_at` and `public.run_no_response_job()`.
- `utils/jobs/no-response.ts` holds the rules as pure functions so the timeline is
  unit-tested without a database.
- `app/portal/admin/reports/actions.ts` now averages resolution time over
  `closure_reason = 'verified_fixed'` only. A No Response close is not a fix and
  must not improve a service metric.

**Decision: the pass runs in Postgres, not JavaScript.** The close has to go
through `transition_ticket()`, which is the only writer of ticket state. Doing it
in one database function keeps the reminder, the notification and the close in
one transaction, and makes a replayed cron a no-op.

**Decision: a 2026-11-11 cutover.** `run_no_response_job` ignores any ticket whose
waiting period began before that instant, so deploying this does not re-close
the historical backlog migrated in Phase 1.

**Requires:** `SUPABASE_SERVICE_ROLE_KEY` as a Worker secret. Without it the job
reports `ran: false` and the site keeps working — the automation simply does not
run.

---

## Phase 5 — Urgent path, business hours, SLA, escalation

- `utils/business-hours.ts`: Monday-Friday 08:00-17:00 Asia/Manila, no
  dependency. The Philippines has no DST, so a fixed +08:00 offset is exact.
- `utils/tickets/sla.ts`: the targets live in one object.
- Urgent gating: choosing Urgent opens a required acknowledgement and a required
  explanation. `submitRequest` rejects an urgent ticket without both, so it
  cannot be bypassed with a crafted form. The justification is shown to staff.
- `supabase/migrations/20261111_04_phase5_sla_escalation.sql` adds the SLA
  columns, the due-date trigger, the escalation pass, and supervisor duty.

| Priority | First response | Resolution |
|---|---|---|
| Urgent | 4 hours, 24/7 | 1 business day |
| High | 1 business day | 3 business days |
| Normal | 2 business days | 5 business days |
| Low | 3 business days | 7 business days |

These are the brief's placeholders. They are **unconfirmed by the owner** and
are one edit in `utils/tickets/sla.ts` plus one migration if they change.

**Decision: "supervisor" is a duty title, not a new `user_role` value.** A
supervisor must be able to act on an escalated ticket, and `transition_ticket()`
only accepts staff roles; adding an enum value the state machine rejects would
have produced an escalation console nobody could use. Supervisors are staff
accounts with `profiles.staff_title = 'supervisor'` and `is_on_call`, which keeps
full acting rights and is what escalation targets. Admins/managers are the
fallback when nobody is marked as a supervisor.

Escalation levels: 1 = reopened more than once, 2 = first-response target
passed, 3 = resolution target passed. Each level notifies once; the job will not
re-notify for a level already reached.

---

## Phase 6 — Access, roles, Track Request

- `app/portal/track` exists. It accepts a Request ID and lists your own recent
  requests. Ownership is enforced twice: RLS, and an explicit
  `requester_id = auth.uid()` filter. A search for someone else's ID returns the
  same "not found" as a random string.
- `utils/auth/email-domain.ts` holds the domain, and the check is now
  case-insensitive and an exact-domain match (`x@perpetual.edu.ph.evil.com` and
  subdomains are still rejected).
- Public sign-up creates **students only**. Employee and staff accounts are
  granted by an administrator. `ALLOWED_SIGNUP_ROLES` is `["student"]`, and the
  submitted role is ignored server-side.
- `submitRequest` requires a confirmed email address.
- Temporary `console.log` diagnostics were removed from the auth actions.

**Unverified:** whether the hosted Supabase project has "Confirm email" enabled.
If it is disabled, users are auto-confirmed and the new check is a no-op rather
than a behaviour change. This is a dashboard setting, not code.

---

## Phase 7 — Public copy

The landing page claimed a `submitted / pending / in progress / completed`
lifecycle that does not exist, pointed at a Track Request page that did not
exist, described an evaluation flow that had not been built, and said "Internal
use only" in the footer of a student-facing service.

Step 04 is now "Resolve and verify", the tracking card shows Resolved with Fix
works / Still broken, the tracking paragraph names the real statuses, and the
FAQ answers the five questions the audit found missing (problem comes back,
needs more information, why rejected, no response, what counts as urgent).

---

## Phase 8 — README, changelog, QA

`README.md` was replaced with a document that matches the real system: roles,
the full transition table, SLA targets, automation, routes, the exact migration
order, and an explicit list of what is unverified.

---

## Phase 9 — Verification by execution

Until this point the migrations had never been run anywhere. `scripts/verify-sql.mjs`
(`npm run verify:sql`) builds a real Postgres in-process (PGlite), applies
`schema.sql` and every migration in order — twice, to prove the files are
geninely re-runnable — then acts as each user by setting the JWT claims and
`SET ROLE`, the way PostgREST does.

It found three defects that reading the SQL had not:

1. **Sign-up was broken.** `handle_new_user()` inserted a `TEXT` variable into
   `profiles.role`, which is an enum. Postgres has no implicit text-to-enum cast,
   so every registration failed with 42804 and rolled back. Fixed in
   `20261111_05_fix_handle_new_user.sql` and in `schema.sql`.
2. **Sign-up could grant admin.** The same trigger took the role from
   `raw_user_meta_data`, which the client controls: calling
   `supabase.auth.signUp()` directly with `{"role":"admin"}` produced an
   administrator. The trigger now always creates a student, and the application's
   "ignored server-side" comment is finally true.
3. **Escalation never ran.** `run_sla_escalation()` inserted a bare
   `'ticket_escalated'` literal through `INSERT ... SELECT`, where Postgres types
   it as `text`; the enum column rejected it and the whole pass aborted, so no
   ticket would ever have escalated. Fixed with an explicit cast in `20261111_04`.

The 22 checks cover the legacy-closed backfill, column-level grants blocking
direct writes for requesters and staff alike, staff being unable to verify (and
so unable to close), unknown actions, strangers, the full assign -> resolve ->
verify -> rate path, reopen restarting the clock and preserving both cycles, RLS
isolation between students, the no-response cutover/reminder/close/idempotency
rules, all four SLA windows, weekend skipping, single-shot escalation to the
supervisor, rejection, and the client-supplied-role attack.

`supabase/verify/alignment_checks.sql` is the same rigour applied to the real
database: 21 read-only invariants covering the honesty of the backfill, the
column grants, the cycle counters, recomputed SLA due dates, and the grants on
the two job functions. The harness seeds pre-migration rows before applying the
migrations, so the upgrade path is exercised against legacy data rather than an
empty tablespace. `--mutation-test` then corrupts three of those invariants and
fails the run unless the verifier reports them, because a check that cannot fail
is not a check.

---

## Phase 10 — Retiring the pre-workflow backlog

Phase 1 could only map staff-closed tickets to Resolved, because no requester
had ever confirmed a fix and "Verified Fixed" would have been false. That left
them in the requesters' verify list forever: the Phase 4 job deliberately
ignores anything dated before its cutover, so nothing would ever close them.

Neither existing closure reason was honest either. `verified_fixed` claims a
confirmation that does not exist; `no_response` names a 5-day automation that
did not exist when these were closed. So `20261111_06_add_administrative_closure.sql`
adds `administrative_closure`, and `supabase/one-off/retire_legacy_tickets.sql`
closes the backlog through a normal status-history insert, which is what lets the
Phase 2 trigger end the work cycle with the same outcome.

The script is a one-off, not a migration: retiring records is a business
decision, and it should be a deliberate, previewable act rather than a side
effect of deploying. It touches only rows that are resolved, unverified and
older than the cutover; it sends no notifications, records no rating, and
re-running it does nothing. Reports continue to count only `verified_fixed` as a
success, so the retirement does not flatter resolution-time metrics.

---

## Schema delivery

The phase-by-phase migrations were consolidated into one file. Thirteen files
that had to be applied in a fixed order — two of them alone — were a standing
invitation to a half-applied database. `supabase/schema.sql` now creates the same
schema in dependency order, in one transaction, and is safe to re-run.

What replaced what:

- `supabase/schema.sql` — the old baseline plus every migration, merged and
  de-duplicated, with the enum types declared at their final values.
- `supabase/upgrade/add_enum_values.sql` — covers the one thing a single
  transaction cannot do: add an enum value and then use it. Existing databases
  run it first, and `schema.sql` fails with that instruction rather than a
  cryptic enum error.
- The original chain stays in git history at `2892ebd`; the phases above refer
  to it by file name.

`npm run verify:sql` applies the file twice, seeds rows an existing installation
already holds, and runs 21 invariants plus 25 behaviour checks. The upgrade path
was exercised by hand: the previous baseline, then `add_enum_values.sql`, then
`schema.sql`, produced the same 21 invariants and migrated a staff-closed ticket
to Resolved with its original timestamp.

---

## Known gaps

- **No email.** Every notification is in-app. The 3-day reminder and the
  escalations are only visible when the user signs in.
- **SLA targets are placeholders** (see the table above).
- **The cron needs a secret.** `SUPABASE_SERVICE_ROLE_KEY` must be set on the
  Worker before the automation runs; until then `scheduled()` is a no-op.
- **Only the local Postgres run is proven.**
  `schema.sql` and all migrations execute cleanly against real Postgres and the
  22 behaviour checks pass (Phase 9). Still unproven is Supabase's own
  environment: RLS enforcement as `authenticated`, PostgREST's handling of the
  RPC, and any role or extension difference from the local run.
- **No automated end-to-end test** of the workflow: the unit tests cover the
  state machine, business hours and job rules, not a real browser session.
- **On-call scheduling** is a boolean duty flag, not a roster with shifts.
