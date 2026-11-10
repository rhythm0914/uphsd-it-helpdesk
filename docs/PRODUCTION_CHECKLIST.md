# Production Readiness Checklist

**UPHSD IT Help Desk** — ordered steps for deploying to production.
**Do not deploy and do not touch production data until each step is verified.**

---

## 1. Backup (before any change)

- [ ] Take a snapshot/backup of the existing Supabase project (`vrnkzglwzwojrxlpofss`).
- [ ] Export current `public.tickets`, `public.profiles`, `public.ticket_status_history` rows.
- [ ] Record the current `wrangler.jsonc` and environment variables.
- [ ] Verify you can restore from the backup.

---

## 2. Migrations (Supabase staging first, never production directly)

Apply in this exact order against a **staging** Supabase project or Supabase Local Stack:

### 2.1 Existing project: enum upgrade first

```sql
-- Run this file ON ITS OWN, then schema.sql.
-- Must commit in its own transaction (Postgres cannot add an enum value
-- and use it in the same transaction).
\i supabase/upgrade/add_enum_values.sql
```

### 2.2 Full schema

```sql
-- Safe to re-run. Creates all types, tables, RLS policies, functions, triggers.
\i supabase/schema.sql
```

### 2.3 Backfill legacy `normal` priority to `medium`

```sql
-- Runs AFTER schema.sql so 'medium' is committed and can be referenced.
\i supabase/upgrade/backfill_normal_to_medium.sql
```

### 2.4 Verify against staging

```bash
# Local verification (PGlite, no Supabase credentials needed)
npm run verify:sql
```

Expected: all invariants PASS, all behaviour checks pass.

### 2.4 Read-only alignment checks (safe on production too)

```sql
\i supabase/verify/alignment_checks.sql
```

Every row must read `PASS`. A FAIL row tells you which invariant broke.

---

## 3. Secrets (Cloudflare Worker)

Never commit secrets. Set them as Worker secrets:

```bash
# Required for the scheduled cron to run at all
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Optional: enables email notifications. Without it, in-app only is used
# and a warning is logged instead.
wrangler secret put RESEND_API_KEY
```

Verify the secrets are set (they are never returned in plain text):

```bash
wrangler secret list
```

Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are already set as `vars` in `wrangler.jsonc` (they are public, not secrets).

**Proof the service role key is never client-bundled:** grep the build output:

```bash
# Should return zero matches for NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
grep -r "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" dist/ || echo "none found (correct)"

# Should return zero matches for SUPABASE_SERVICE_ROLE_KEY in client code
grep -r "SUPABASE_SERVICE_ROLE_KEY" dist/client/ || echo "none found in client bundle (correct)"
```

---

## 4. Deploy

```bash
# Build
npm run build:vinext

# Deploy to Cloudflare Workers
npm run deploy:vinext
```

The `scheduled()` handler in `cloudflare/worker-entry.ts` is a Cloudflare Worker cron handler. **It cannot be invoked via a public HTTP fetch route** — only by the cron trigger.

---

## 5. Cron triggers

Confirm cron is enabled in `wrangler.jsonc`:

```jsonc
"triggers": {
  "crons": ["0 * * * *"]
}
```

After deploy, verify the cron trigger is active in the Cloudflare dashboard (Workers → Triggers → Cron triggers). It should show `0 * * * *` (hourly, on the hour).

### First run confirmation

Watch the Worker logs after the first cron fire:

```bash
wrangler tail --format pretty
```

Log lines to look for:

```
[notifications] email channel configured (Resend)        # if RESEND_API_KEY is set
[notifications] RESEND_API_KEY is not set — email notifications disabled; in-app only.  # if not
[scheduled] RESEND_API_KEY is not configured — email delivery disabled; in-app notifications only.
```

Successful job run:

```
[scheduled] maintenance pass completed: noResponse={reminded:1, closed:0}, escalation={escalated:0}
```

If `SUPABASE_SERVICE_ROLE_KEY` is missing:

```
[scheduled] SUPABASE_SERVICE_ROLE_KEY is not configured; scheduled passes skipped.
```

---

## 6. Supabase dashboard settings

### 6.1 Confirm email (required for the confirmed-email gate)

In the Supabase dashboard (Authentication → Settings):

- [ ] **Enable email confirmations** — ON. Without this, `email_confirmed_at` is auto-set and the "check your email" flow is a no-op.
- [ ] Verify redirect URLs include `https://uphsd-it-helpdesk.rycanano.workers.dev/auth/callback`

### 6.2 SMTP (optional, for email notifications)

If using Resend for email notifications:

- [ ] `RESEND_API_KEY` is set as a Worker secret (step 3).
- [ ] The `from` address is verified in Resend (default: `noreply@uphsd.edu.ph` — change in `utils/notifications/resend.ts` if needed).
- [ ] Test email delivery with a ticket transition and check `public.notification_delivery`.

### 6.3 Redirect URLs

Authentication → Settings → URL Configuration:

- [ ] Site URL: `https://uphsd-it-helpdesk.rycanano.workers.dev`
- [ ] Redirect URLs include:
  - `https://uphsd-it-helpdesk.rycanano.workers.dev/auth/callback`

---

## 7. Smoke tests

Run these against the deployed production URL after deploy:

### 7.1 Auth

- [ ] Sign up with `@perpetual.edu.ph` → receives confirmation email, account created as `student` role only.
- [ ] Sign up with `perpetual.edu.ph.evil.com` → rejected.
- [ ] Sign up with `sub.perpetual.edu.ph` → rejected (exact domain match only).
- [ ] Sign in with confirmed email → redirected to `/portal`.

### 7.2 Ticket workflow (as requester)

- [ ] Submit a new request → receives `IT-2026-XXXXX` ticket number.
- [ ] Track the request at `/portal/track` (requires sign-in).
- [ ] When IT marks resolved → receives "Verify your request" in-app notification (+ email if configured).
- [ ] Choose "Fix works" + rating 1-5 → ticket closes as Verified Fixed.
- [ ] Choose "Still broken" + reason → ticket reopens with same ID.

### 7.3 Ticket workflow (as staff)

- [ ] Assign a technician → ticket moves to Assigned / In Progress.
- [ ] Resolve with a note → ticket moves to Resolved (cannot close directly).
- [ ] Request more information → ticket moves to Awaiting Student.
- [ ] Reject with reason → ticket moves to Rejected (terminal).

### 7.4 Automation (cron)

- [ ] Wait for the hourly cron to fire (or trigger manually in dashboard).
- [ ] Verify `run_no_response_job` sends reminders at 3 days, closes at 5.
- [ ] Verify `run_sla_escalation` escalates breached tickets.
- [ ] Confirm no ticket is touched twice on replay (idempotent).

### 7.5 Email (if RESEND_API_KEY is configured)

- [ ] Check `public.notification_delivery` for `channel = 'email'` rows.
- [ ] Confirm `status = 'sent'` for successful deliveries.
- [ ] Confirm failures are logged with `error` but never block the ticket transition.

---

## 8. Rollback

If anything fails after deploy:

1. Restore the Supabase backup from step 1.
2. Revert the Cloudflare Worker deployment (`wrangler rollback` or redeploy previous version).
3. Remove the secrets if they were misconfigured.

---

## Files changed for production readiness

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Adds `notification_delivery` table |
| `supabase/upgrade/add_enum_values.sql` | Enum upgrade for existing projects |
| `supabase/upgrade/backfill_normal_to_medium.sql` | Backfills legacy `normal` priority to `medium` |
| `supabase/verify/alignment_checks.sql` | Read-only invariants (unmodified) |
| `supabase/verify/dry_run_legacy_closed_backfill.sql` | Read-only report for legacy backlog (do not execute) |
| `utils/notifications/notifier.ts` | Provider interface |
| `utils/notifications/resend.ts` | Resend email provider |
| `utils/notifications/index.ts` | Factory + send helper |
| `utils/notifications/server.ts` | Server-action delivery helper |
| `utils/jobs/run-scheduled.ts` | Cron job + email delivery for reminders/escalations |
| `cloudflare/worker-entry.ts` | Cron entry + missing-key warning |
| `wrangler.jsonc` | Cron trigger documented + RESEND_API_KEY secret note |
| `app/portal/queue/actions.ts` | Email on resolve/reject/request-info/assign/acknowledge |
| `app/portal/tickets/[id]/actions.ts` | Email on verify/reopen/reply |
| `app/page.tsx` | Landing page copy corrections |
| `README.md` | Notifications section + known limitations updated |
| `docs/CHANGELOG_ALIGNMENT.md` | Known gaps updated |
| `tests/unit/notifications.test.ts` | 8 tests with fake email provider |
