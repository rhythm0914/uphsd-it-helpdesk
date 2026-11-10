#!/usr/bin/env node
/**
 * Apply supabase/schema.sql and every migration, in order, to a real Postgres
 * (PGlite, Postgres compiled to WASM) on this machine, then assert the
 * behaviour the alignment promised.
 *
 * This exists because the migrations had never been executed anywhere. A SQL
 * file that parses is not a SQL file that runs, and an unrun migration is a
 * production outage waiting for the first ticket action.
 *
 *   node scripts/verify-sql.mjs            # apply + assert
 *   node scripts/verify-sql.mjs --verbose  # also print each file as it runs
 *
 * Supabase supplies the auth schema, the auth.* helpers and the PostgREST
 * roles. Those are the only things stubbed here; every other statement is the
 * project's own SQL, executed unchanged.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

const root = process.cwd();
const verbose = process.argv.includes('--verbose');

// Supabase's own environment, reduced to what the migrations touch.
const BOOTSTRAP = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;

  CREATE SCHEMA IF NOT EXISTS auth;

  CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    email_confirmed_at TIMESTAMPTZ,
    raw_user_meta_data JSONB DEFAULT '{}'::JSONB
  );

  -- GoTrue puts the verified JWT claims in session settings; these mirror that.
  CREATE FUNCTION auth.uid() RETURNS UUID
    LANGUAGE sql STABLE
    AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::UUID $$;

  CREATE FUNCTION auth.role() RETURNS TEXT
    LANGUAGE sql STABLE
    AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
`;

const db = await new PGlite({ extensions: { uuid_ossp } });

/** Run a file the way the Supabase migration runner does: one transaction per file. */
async function applyFile(label, sql) {
  await db.exec('BEGIN');
  try {
    await db.exec(sql);
    await db.exec('COMMIT');
  } catch (err) {
    await db.exec('ROLLBACK');
    throw new Error(`${label} failed:\n  ${err.message}`);
  }
  if (verbose) console.log(`  ok  ${label}`);
}

/**
 * Rows a live database already holds, written before the migrations run. The
 * upgrade path matters more than a greenfield install: the backfill, the cycle
 * rows and the SLA targets all have to cope with tickets that predate them.
 */
async function seedLegacy() {
  // These users predate the version of handle_new_user() that is broken, so the
  // trigger is off for the seed rather than pretending the old one worked.
  await db.exec('ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created');
  await db.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, 'legacy-student@uphsd.edu.ph'),
                                                   ($2, 'legacy-tech@uphsd.edu.ph')`,
    [U.student, U.tech],
  );
  await db.query(
    `INSERT INTO public.profiles (id, email, full_name, role)
     VALUES ($1, 'legacy-student@uphsd.edu.ph', 'Legacy Student', 'student'),
            ($2, 'legacy-tech@uphsd.edu.ph', 'Legacy Tech', 'it_staff')`,
    [U.student, U.tech],
  );
  await db.query(`INSERT INTO public.services (id, name) VALUES ($1, 'Network')`, [SERVICE]);
  await db.query(`INSERT INTO public.ticket_categories (id, name) VALUES ($1, 'Connectivity')`, [CATEGORY]);

  // Closed by staff under the old workflow, with no requester verification.
  await db.query(
    `INSERT INTO public.tickets
       (ticket_number, requester_id, service_id, category_id, subject, description,
        priority, status, created_at, closed_at)
     VALUES ('LEGACY-001', $1, $2, $3, 'Old closed ticket', 'Details',
             'normal', 'closed', '2026-08-01T00:00:00Z', '2026-08-20T00:00:00Z')`,
    [U.student, SERVICE, CATEGORY],
  );
  // Still open, and already past its (future) resolution target.
  await db.query(
    `INSERT INTO public.tickets
       (ticket_number, requester_id, service_id, category_id, subject, description,
        priority, status, created_at)
     VALUES ('LEGACY-002', $1, $2, $3, 'Old open ticket', 'Details',
             'high', 'open', now() - INTERVAL '30 days')`,
    [U.student, SERVICE, CATEGORY],
  );
  await db.exec('ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created');
}

/** Runs supabase/verify/alignment_checks.sql and fails if any invariant breaks. */
async function runAlignmentChecks() {
  const sql = readFileSync(join(root, 'supabase/verify/alignment_checks.sql'), 'utf8');
  const { rows } = await db.query(sql);
  const failed = rows.filter((r) => r.result !== 'PASS');
  console.log(`Verification script: ${rows.length - failed.length}/${rows.length} PASS`);
  for (const f of failed) {
    console.log(`  FAIL  ${f.check_name} (${f.offenders} offenders)`);
  }
  if (failed.length) throw new Error(`${failed.length} invariant(s) failed after the migrations`);
  console.log('');
}

async function main() {
  console.log('Bootstrapping Supabase auth stubs...');
  await db.exec(BOOTSTRAP);

  console.log('Applying schema.sql...');
  await applyFile('supabase/schema.sql', readFileSync(join(root, 'supabase/schema.sql'), 'utf8'));

  console.log('Seeding pre-migration rows (simulating a live database)...');
  await seedLegacy();

  const migrations = readdirSync(join(root, 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Applying ${migrations.length} migrations in order...`);
  for (const file of migrations) {
    const sql = readFileSync(join(root, 'supabase/migrations', file), 'utf8');
    await applyFile(`migrations/${file}`, sql);
  }

  // Re-applying must be safe: the files claim to be idempotent, and a failed
  // partial deploy is recovered by running them again.
  console.log('Re-applying migrations (idempotency)...');
  for (const file of migrations) {
    const sql = readFileSync(join(root, 'supabase/migrations', file), 'utf8');
    await applyFile(`migrations/${file} (rerun)`, sql);
  }

  console.log(`\nAll ${migrations.length} migrations applied cleanly, twice.\n`);

  await runAlignmentChecks();
  await runChecks();
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const U = {
  student: '11111111-1111-1111-1111-111111111111',
  other: '22222222-2222-2222-2222-222222222222',
  tech: '33333333-3333-3333-3333-333333333333',
  supervisor: '44444444-4444-4444-4444-444444444444',
  admin: '55555555-5555-5555-5555-555555555555',
};

const SERVICE = 'aaaaaaaa-0000-0000-0000-000000000001';
const CATEGORY = 'aaaaaaaa-0000-0000-0000-000000000002';

const PEOPLE = [
  [U.student, 'student@uphsd.edu.ph', 'Student One', 'student', null],
  [U.other, 'other@uphsd.edu.ph', 'Student Two', 'student', null],
  [U.tech, 'tech@uphsd.edu.ph', 'Tech One', 'it_staff', 'technician'],
  [U.supervisor, 'sup@uphsd.edu.ph', 'Supervisor One', 'it_staff', 'supervisor'],
  [U.admin, 'admin@uphsd.edu.ph', 'Admin One', 'admin', null],
];

async function seed() {
  for (const [id, email, name, role, title] of PEOPLE) {
    await db.query(
      `INSERT INTO auth.users (id, email, email_confirmed_at)
       VALUES ($1, $2, now()) ON CONFLICT (id) DO NOTHING`,
      [id, email],
    );
    await db.query(
      `INSERT INTO public.profiles (id, email, full_name, role, staff_title)
       VALUES ($1, $2, $3, $4::public.user_role, $5)
       ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, staff_title = EXCLUDED.staff_title`,
      [id, email, name, role, title],
    );
  }
  await db.query(
    `INSERT INTO public.services (id, name) VALUES ($1, 'Network') ON CONFLICT DO NOTHING`,
    [SERVICE],
  );
  await db.query(
    `INSERT INTO public.ticket_categories (id, name) VALUES ($1, 'Connectivity') ON CONFLICT DO NOTHING`,
    [CATEGORY],
  );
}

let ticketSeq = 0;
async function newTicket({ requester = U.student, priority = 'normal', subject = 'Cannot connect' } = {}) {
  ticketSeq += 1;
  const { rows } = await db.query(
    `INSERT INTO public.tickets
       (ticket_number, requester_id, service_id, category_id, subject, description, priority)
     VALUES ($1, $2, $3, $4, $5, 'Details', $6::public.ticket_priority)
     RETURNING id`,
    [`TKT-TEST-${ticketSeq}`, requester, SERVICE, CATEGORY, subject, priority],
  );
  return rows[0].id;
}

// ---------------------------------------------------------------------------
// Acting as a real user: PostgREST authenticates by setting the JWT claims and
// running as `authenticated`. The stubs read exactly those settings.
// ---------------------------------------------------------------------------

async function asActor(userId, role, fn) {
  await db.exec(`SET ROLE ${role}`);
  await db.query(
    `SELECT set_config('request.jwt.claim.sub', $1, false),
            set_config('request.jwt.claim.role', $2, false)`,
    [userId ?? '', role],
  );
  try {
    return await fn();
  } finally {
    await db.exec('RESET ROLE');
    await db.query(
      `SELECT set_config('request.jwt.claim.sub', '', false),
              set_config('request.jwt.claim.role', '', false)`,
    );
  }
}

const asStudent = (fn) => asActor(U.student, 'authenticated', fn);
const asTech = (fn) => asActor(U.tech, 'authenticated', fn);
const asSystem = (fn) => asActor(null, 'service_role', fn);

/** Holds the service_role grant but claims to be a normal user. */
async function asSystemClaiming(claim, fn) {
  await db.exec('SET ROLE service_role');
  await db.query(`SELECT set_config('request.jwt.claim.role', $1, false)`, [claim]);
  try {
    return await fn();
  } finally {
    await db.exec('RESET ROLE');
    await db.query(`SELECT set_config('request.jwt.claim.role', '', false)`);
  }
}

async function transition(userId, role, ticketId, action, payload = {}) {
  return asActor(userId, role, async () => {
    const { rows } = await db.query(
      `SELECT * FROM public.transition_ticket($1, $2, $3::JSONB)`,
      [ticketId, action, JSON.stringify(payload)],
    );
    return rows[0];
  });
}

const asStaff = (ticketId, action, payload = {}) =>
  transition(U.tech, 'authenticated', ticketId, action, payload);
const asRequester = (ticketId, action, payload = {}) =>
  transition(U.student, 'authenticated', ticketId, action, payload);

async function one(sql, params = []) {
  const { rows } = await db.query(sql, params);
  return rows[0];
}

async function expectFailure(fn, pattern, label) {
  try {
    await fn();
  } catch (err) {
    if (pattern.test(err.message)) return err.message;
    throw new Error(`${label || 'call'} raised the wrong error: ${err.message}`);
  }
  throw new Error(`${label || 'call'} was allowed but must be refused`);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err: err.message });
    console.log(`  FAIL  ${name}\n        ${err.message.split('\n').join('\n        ')}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function eq(actual, expected, what) {
  if (String(actual) !== String(expected)) {
    throw new Error(`${what}: expected ${expected}, got ${actual}`);
  }
}

async function runChecks() {
  await seed();

  console.log('Behaviour checks\n');

  await retirementChecks();

  // -------------------------------------------------------------------------
  // 1. Legacy staff-closed tickets cannot become "Verified Fixed" after the
  //    fact: the migration maps them to Resolved and records why.
  // -------------------------------------------------------------------------
  const legacy = await newTicket({ subject: 'Legacy closed ticket' });
  await db.query(
    `UPDATE public.tickets SET status = 'closed', closed_at = '2026-09-01T00:00:00Z' WHERE id = $1`,
    [legacy],
  );
  await applyFile(
    'migrations/20261110_02 (backfill)',
    readFileSync(join(root, 'supabase/migrations/20261110_02_phase1_ticket_state_machine.sql'), 'utf8'),
  );

  await check('legacy closed ticket is migrated to Resolved, not Verified Fixed', async () => {
    const t = await one(`SELECT status, closure_reason, resolved_at, closed_at FROM public.tickets WHERE id = $1`, [legacy]);
    eq(t.status, 'resolved', 'status');
    assert(t.closure_reason === null, `closure_reason must stay empty, got ${t.closure_reason}`);
    assert(t.resolved_at !== null, 'resolved_at must be preserved for reporting');
    assert(t.closed_at === null, 'closed_at must be cleared');
    const h = await one(
      `SELECT reason FROM public.ticket_status_history WHERE ticket_id = $1 AND old_status = 'closed' AND new_status = 'resolved'`,
      [legacy],
    );
    assert(h, 'the migration must write an audit row explaining the change');
  });

  // -------------------------------------------------------------------------
  // 2. Requesters have no UPDATE privilege on state columns at all.
  // -------------------------------------------------------------------------
  const own = await newTicket({ subject: 'Own ticket' });

  await check('requester cannot write tickets.status directly', async () => {
    await expectFailure(
      () =>
        asStudent(() =>
          db.query(`UPDATE public.tickets SET status = 'closed' WHERE id = $1`, [own]),
        ),
      /permission denied/i,
      'direct status update',
    );
  });

  await check('staff cannot write tickets.status directly either', async () => {
    await expectFailure(
      () =>
        asTech(() =>
          db.query(`UPDATE public.tickets SET status = 'closed' WHERE id = $1`, [own]),
        ),
      /permission denied/i,
      'direct status update',
    );
  });

  // -------------------------------------------------------------------------
  // 3. Only the requester can close, and only by verifying a fix.
  // -------------------------------------------------------------------------
  await check('technician cannot close a ticket by verifying it', async () => {
    await expectFailure(
      () => asStaff(own, 'verify_fixed', { rating: 5 }),
      /Only the requester/i,
      'staff verify_fixed',
    );
  });

  await check('an unknown action is refused', async () => {
    await expectFailure(
      () => asStaff(own, 'close'),
      /Unknown ticket action/i,
      'close action',
    );
  });

  await check('a stranger cannot act on someone else\u2019s ticket', async () => {
    await expectFailure(
      () => transition(U.other, 'authenticated', own, 'resolve', { resolution_note: 'nope' }),
      /Ticket not found/i,
      'stranger transition',
    );
  });

  // -------------------------------------------------------------------------
  // 4. The happy path, end to end.
  // -------------------------------------------------------------------------
  await check('full cycle: assign, resolve, verify, rate', async () => {
    const id = await newTicket({ subject: 'Printer offline' });

    const assigned = await asStaff(id, 'assign', { assigned_to: U.tech });
    eq(assigned.status, 'in_progress', 'status after assign');
    eq(assigned.assigned_to, U.tech, 'assignee');

    const resolved = await asStaff(id, 'resolve', { resolution_note: 'Replaced the network cable.' });
    eq(resolved.status, 'resolved', 'status after resolve');
    assert(resolved.resolved_at !== null, 'resolved_at must be set');

    const notified = await one(
      `SELECT count(*)::int AS n FROM public.notifications
       WHERE ticket_id = $1 AND user_id = $2 AND type = 'ticket_resolved'`,
      [id, U.student],
    );
    eq(notified.n, 1, 'requester notifications on resolve');

    const closed = await asRequester(id, 'verify_fixed', { rating: 5, comment: 'Fast.' });
    eq(closed.status, 'closed', 'status after verify');
    eq(closed.closure_reason, 'verified_fixed', 'closure reason');

    const rated = await one(`SELECT rating FROM public.ticket_feedback WHERE ticket_id = $1`, [id]);
    eq(rated.rating, 5, 'rating stored');

    const cycle = await one(
      `SELECT outcome, resolved_at, ended_at FROM public.ticket_cycles
       WHERE ticket_id = $1 AND cycle_number = 1`,
      [id],
    );
    eq(cycle.outcome, 'verified_fixed', 'cycle outcome');
    assert(cycle.ended_at !== null, 'cycle must be closed');
  });

  await check('a resolved ticket cannot be resolved again', async () => {
    const id = await newTicket({ subject: 'Double resolve' });
    await asStaff(id, 'resolve', { resolution_note: 'Done.' });
    await expectFailure(
      () => asStaff(id, 'resolve', { resolution_note: 'Done again.' }),
      /Cannot resolve/i,
      'second resolve',
    );
  });

  await check('resolving without a resolution note is refused', async () => {
    const id = await newTicket({ subject: 'No note' });
    await expectFailure(
      () => asStaff(id, 'resolve', {}),
      /resolution note is required/i,
      'resolve without note',
    );
  });

  // -------------------------------------------------------------------------
  // 5. Reopen restarts the clock and keeps both cycles.
  // -------------------------------------------------------------------------
  await check('reopen starts a second cycle and clears resolved_at', async () => {
    const id = await newTicket({ subject: 'Still broken' });
    await asStaff(id, 'assign', { assigned_to: U.tech });
    await asStaff(id, 'resolve', { resolution_note: 'Updated driver.' });
    const before = await one(`SELECT sla_started_at FROM public.tickets WHERE id = $1`, [id]);

    const reopened = await asRequester(id, 'report_still_broken', { reason: 'The wifi still drops.' });
    eq(reopened.status, 'reopened', 'status after reopen');
    eq(reopened.reopened_count, 1, 'reopen counter');

    // The cycle reset is done by the Phase 2 trigger, which runs after the
    // function's own UPDATE, so the persisted row is what matters here.
    const after = await one(
      `SELECT resolved_at, current_cycle, sla_started_at FROM public.tickets WHERE id = $1`,
      [id],
    );
    assert(after.resolved_at === null, 'resolved_at must be cleared');
    eq(after.current_cycle, 2, 'current cycle');
    assert(
      new Date(after.sla_started_at) > new Date(before.sla_started_at),
      'the SLA clock must restart on reopen',
    );

    const cycles = await one(
      `SELECT count(*)::int AS n, count(*) FILTER (WHERE outcome = 'reopened')::int AS reopened
       FROM public.ticket_cycles WHERE ticket_id = $1`,
      [id],
    );
    eq(cycles.n, 2, 'cycle rows');
    eq(cycles.reopened, 1, 'ended cycle keeps its outcome');

    const msg = await one(
      `SELECT count(*)::int AS n FROM public.ticket_messages
       WHERE ticket_id = $1 AND message LIKE 'The issue is still broken:%'`,
      [id],
    );
    eq(msg.n, 1, 'reopen reason is visible in the conversation');
  });

  await check('a resolved ticket cannot be verified by a stranger', async () => {
    const id = await newTicket({ subject: 'Stranger verify' });
    await asStaff(id, 'resolve', { resolution_note: 'Fixed.' });
    await expectFailure(
      () => transition(U.other, 'authenticated', id, 'verify_fixed', { rating: 5 }),
      /Ticket not found/i,
      'stranger verify',
    );
  });

  // -------------------------------------------------------------------------
  // 6. Data isolation: the track page query cannot leak across students.
  // -------------------------------------------------------------------------
  await check('RLS hides another student\u2019s tickets and notifications', async () => {
    const seen = await asActor(U.other, 'authenticated', async () => {
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM public.tickets WHERE id = $1`, [own]);
      const { rows: notes } = await db.query(
        `SELECT count(*)::int AS n FROM public.notifications WHERE user_id = $1`,
        [U.student],
      );
      return { tickets: rows[0].n, notifications: notes[0].n };
    });
    eq(seen.tickets, 0, 'foreign ticket visible');
    eq(seen.notifications, 0, 'foreign notification visible');
  });

  // -------------------------------------------------------------------------
  // 7. No-response pass: cutover guard, reminder, close, idempotency.
  // -------------------------------------------------------------------------
  await check('only the scheduled job may run the no-response pass', async () => {
    // Denied at the grant level, before the function body even runs.
    await expectFailure(
      () => asStudent(() => db.query(`SELECT * FROM public.run_no_response_job()`)),
      /permission denied for function/i,
      'student run job',
    );
    await expectFailure(
      () => asTech(() => db.query(`SELECT * FROM public.run_no_response_job()`)),
      /permission denied for function/i,
      'staff run job',
    );
    // And the body refuses a caller that holds the grant but is not the job.
    await expectFailure(
      () => asSystemClaiming('authenticated', () => db.query(`SELECT * FROM public.run_no_response_job()`)),
      /Only the scheduled job/i,
      'authenticated claim with the grant',
    );
  });

  await check('no-response pass honours the cutover and the 3/5 day rules', async () => {
    const cutover = '2026-11-11T00:00:00Z';
    const now_ = '2026-12-10T00:00:00Z';

    const remind = await newTicket({ subject: 'Awaiting reply 4 days' });
    await db.query(
      `UPDATE public.tickets SET status = 'waiting_for_user', awaiting_student_since = '2026-12-06T00:00:00Z' WHERE id = $1`,
      [remind],
    );

    const closeMe = await newTicket({ subject: 'Resolved 6 days ago' });
    await db.query(
      `UPDATE public.tickets SET status = 'resolved', resolved_at = '2026-12-04T00:00:00Z' WHERE id = $1`,
      [closeMe],
    );

    // Waiting since before the cutover: the legacy backlog must be left alone.
    const ancient = await newTicket({ subject: 'Resolved before cutover' });
    await db.query(
      `UPDATE public.tickets SET status = 'resolved', resolved_at = '2026-11-01T00:00:00Z' WHERE id = $1`,
      [ancient],
    );

    const run = await asSystem(async () => {
      const { rows } = await db.query(`SELECT * FROM public.run_no_response_job($1::TIMESTAMPTZ, $2::TIMESTAMPTZ)`, [now_, cutover]);
      return rows[0];
    });
    assert(run.reminded >= 1, `expected at least one reminder, got ${run.reminded}`);
    assert(run.closed >= 1, `expected at least one close, got ${run.closed}`);

    const remindedTicket = await one(`SELECT status FROM public.tickets WHERE id = $1`, [remind]);
    eq(remindedTicket.status, 'waiting_for_user', 'a 4-day-old ticket is reminded, not closed');

    const closedTicket = await one(`SELECT status, closure_reason, closed_at FROM public.tickets WHERE id = $1`, [closeMe]);
    eq(closedTicket.status, 'closed', '5-day-old ticket closed');
    eq(closedTicket.closure_reason, 'no_response', 'closure reason');
    assert(closedTicket.closed_at !== null, 'closed_at set');

    const untouchable = await one(`SELECT status FROM public.tickets WHERE id = $1`, [ancient]);
    eq(untouchable.status, 'resolved', 'pre-cutover ticket must not be re-closed');

    const reminder = await one(
      `SELECT count(*)::int AS n FROM public.notifications
       WHERE ticket_id = $1 AND type = 'ticket_reminder'`,
      [remind],
    );
    eq(reminder.n, 1, 'one reminder');

    const feedback = await one(`SELECT count(*)::int AS n FROM public.ticket_feedback WHERE ticket_id = $1`, [closeMe]);
    eq(feedback.n, 0, 'a No Response close is never rated as verified');

    // Replay: nothing new may happen.
    const again = await asSystem(async () => {
      const { rows } = await db.query(`SELECT * FROM public.run_no_response_job($1::TIMESTAMPTZ, $2::TIMESTAMPTZ)`, [now_, cutover]);
      return rows[0];
    });
    eq(again.reminded, 0, 'replay reminders');
    eq(again.closed, 0, 'replay closes');
  });

  // -------------------------------------------------------------------------
  // 8. SLA maths, including the weekend.
  // -------------------------------------------------------------------------
  await check('urgent tickets get a 4-hour response clock', async () => {
    const id = await newTicket({ subject: 'Whole lab is down', priority: 'urgent' });
    const t = await one(
      `SELECT extract(epoch FROM (response_due_at - created_at)) / 3600 AS hours FROM public.tickets WHERE id = $1`,
      [id],
    );
    eq(Math.round(Number(t.hours)), 4, 'urgent response window (hours)');
  });

  await check('business days skip the weekend', async () => {
    const friday = '2026-11-13T01:00:00Z'; // Friday 09:00 in Manila
    const due = await one(`SELECT public.add_business_days($1::TIMESTAMPTZ, 1) AS d`, [friday]);
    eq(new Date(due.d).toISOString(), '2026-11-16T01:00:00.000Z', 'Fri + 1 business day');
  });

  await check('normal priority gets a 2-business-day response target', async () => {
    const id = await newTicket({ subject: 'Slow laptop' });
    const t = await one(
      `SELECT response_due_at, resolve_due_at, sla_status FROM public.tickets WHERE id = $1`,
      [id],
    );
    assert(t.response_due_at !== null && t.resolve_due_at !== null, 'due dates must be derived');
    assert(
      new Date(t.response_due_at) < new Date(t.resolve_due_at),
      'the response target must come before the resolution target',
    );
    assert(['on_track', 'at_risk', 'breached'].includes(t.sla_status), `bad sla_status ${t.sla_status}`);
  });

  // -------------------------------------------------------------------------
  // 9. Escalation reaches the supervisor, not nobody.
  // -------------------------------------------------------------------------
  await check('only the scheduled job may escalate', async () => {
    await expectFailure(
      () => asTech(() => db.query(`SELECT * FROM public.run_sla_escalation()`)),
      /permission denied for function/i,
      'staff escalation',
    );
    await expectFailure(
      () => asSystemClaiming('authenticated', () => db.query(`SELECT * FROM public.run_sla_escalation()`)),
      /Only the scheduled job/i,
      'authenticated claim with the grant',
    );
  });

  await check('a breached ticket escalates to the on-call supervisor', async () => {
    const id = await newTicket({ subject: 'Breached SLA' });
    await asStaff(id, 'assign', { assigned_to: U.tech });
    await db.query(
      `UPDATE public.tickets
          SET sla_started_at = '2026-12-01T00:00:00Z', resolve_due_at = '2026-12-09T00:00:00Z'
        WHERE id = $1`,
      [id],
    );

    const run = await asSystem(async () => {
      const { rows } = await db.query(`SELECT * FROM public.run_sla_escalation('2026-12-10T00:00:00Z')`);
      return rows[0];
    });
    assert(run.escalated >= 1, 'at least one escalation');

    const t = await one(`SELECT escalation_level, escalated_at, sla_status FROM public.tickets WHERE id = $1`, [id]);
    eq(t.escalation_level, 3, 'escalation level for a passed resolution target');
    assert(t.escalated_at !== null, 'escalated_at set');
    eq(t.sla_status, 'breached', 'badge');

    const toSup = await one(
      `SELECT count(*)::int AS n FROM public.notifications
       WHERE ticket_id = $1 AND user_id = $2 AND type = 'ticket_escalated'`,
      [id, U.supervisor],
    );
    eq(toSup.n, 1, 'supervisor notified');

    const replay = await asSystem(async () => {
      const { rows } = await db.query(`SELECT * FROM public.run_sla_escalation('2026-12-10T00:00:00Z')`);
      return rows[0];
    });
    eq(replay.escalated, 0, 'a ticket is escalated once, not on every pass');
  });

  // -------------------------------------------------------------------------
  // 10. Rejection is explainable and final.
  // -------------------------------------------------------------------------
  await check('rejection requires a reason and tells the requester', async () => {
    const id = await newTicket({ subject: 'Not an IT issue' });
    await expectFailure(
      () => asStaff(id, 'reject', { rejection_category: 'out_of_scope' }),
      /rejection reason is required/i,
      'reject without reason',
    );

    const rejected = await asStaff(id, 'reject', {
      rejection_category: 'out_of_scope',
      reason: 'This is a facilities matter.',
    });
    eq(rejected.status, 'rejected', 'status');
    eq(rejected.rejection_category, 'out_of_scope', 'category');

    const n = await one(
      `SELECT count(*)::int AS n FROM public.notifications
       WHERE ticket_id = $1 AND user_id = $2 AND type = 'ticket_rejected'`,
      [id, U.student],
    );
    eq(n.n, 1, 'requester told');

    await expectFailure(
      () => asRequester(id, 'report_still_broken', { reason: 'Try again' }),
      /Only a resolved ticket/i,
      'reopen a rejected ticket',
    );
  });

  // -------------------------------------------------------------------------
  // 10b. Sign-up ignores a client-supplied role.
  // -------------------------------------------------------------------------
  await check('sign-up creates a student even when the client asks for admin', async () => {
    const id = '66666666-6666-6666-6666-666666666666';
    await db.query(
      `INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
       VALUES ($1, 'sneaky@uphsd.edu.ph', now(), '{"role":"admin","full_name":"Sneaky"}'::JSONB)`,
      [id],
    );
    const p = await one(`SELECT role, full_name FROM public.profiles WHERE id = $1`, [id]);
    assert(p, 'the trigger must create a profile row');
    eq(p.role, 'student', 'role from client metadata');
    eq(p.full_name, 'Sneaky', 'name is still taken from metadata');
  });

  // -------------------------------------------------------------------------
  // 11. The existing verification script is itself valid SQL.
  // -------------------------------------------------------------------------
  await check('supabase/verify/phase2_checks.sql executes', async () => {
    const sql = readFileSync(join(root, 'supabase/verify/phase2_checks.sql'), 'utf8');
    await db.exec(sql);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

  if (process.argv.includes('--mutation-test')) await mutationTest();
  if (failed.length) {
    console.log('\nFailures:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.err}`);
    process.exitCode = 1;
  }
}

/**
 * The one-off retirement script: run it on migrated legacy data, then again.
 */
async function retirementChecks() {
  const script = join(root, 'supabase/one-off/retire_legacy_tickets.sql');

  await check('retirement closes only pre-cutover unverified tickets', async () => {
    const legacy = await one(`SELECT id, status, resolved_at FROM public.tickets WHERE ticket_number = 'LEGACY-001'`);
    eq(legacy.status, 'resolved', 'fixture must start resolved');

    await db.exec(readFileSync(script, 'utf8'));

    const remaining = await one(
      `SELECT count(*)::int AS n FROM public.tickets
       WHERE status = 'resolved' AND closure_reason IS NULL
         AND resolved_at < '2026-11-11T00:00:00Z'`,
    );
    eq(remaining.n, 0, 'eligible tickets left');

    const t = await one(`SELECT status, closure_reason, closed_at FROM public.tickets WHERE id = $1`, [legacy.id]);
    eq(t.status, 'closed', 'status');
    eq(t.closure_reason, 'administrative_closure', 'closure reason');
    assert(t.closed_at !== null, 'closed_at must be set');

    const audit = await one(
      `SELECT count(*)::int AS n FROM public.ticket_status_history
       WHERE ticket_id = $1 AND old_status = 'resolved' AND new_status = 'closed'
         AND reason = 'Administrative retirement of a pre-workflow ticket'`,
      [legacy.id],
    );
    eq(audit.n, 1, 'audit rows');

    const cycle = await one(
      `SELECT outcome, ended_at FROM public.ticket_cycles WHERE ticket_id = $1 AND cycle_number = 1`,
      [legacy.id],
    );
    eq(cycle.outcome, 'administrative_closure', 'cycle outcome');
    assert(cycle.ended_at !== null, 'cycle must be ended');
  });

  await check('retirement leaves the requester\u2019s rating untouched (none invented)', async () => {
    const f = await one(
      `SELECT count(*)::int AS n FROM public.ticket_feedback f
       JOIN public.tickets t ON t.id = f.ticket_id
       WHERE t.ticket_number = 'LEGACY-001'`,
    );
    eq(f.n, 0, 'feedback rows on a retired ticket');
  });

  await check('retirement is a no-op when re-run', async () => {
    const countSql = `SELECT count(*)::int AS n FROM public.ticket_status_history
       WHERE reason = 'Administrative retirement of a pre-workflow ticket'`;
    const before = await one(countSql);
    await db.exec(readFileSync(script, 'utf8'));
    const after = await one(countSql);
    eq(after.n, before.n, 'audit rows added by a second run');
  });

  await check('re-applying the Phase 1 migration does not un-retire tickets', async () => {
    await applyFile(
      'migrations/20261110_02 (rerun after retirement)',
      readFileSync(join(root, 'supabase/migrations/20261110_02_phase1_ticket_state_machine.sql'), 'utf8'),
    );
    const t = await one(`SELECT status, closure_reason FROM public.tickets WHERE ticket_number = 'LEGACY-001'`);
    eq(t.status, 'closed', 'status');
    eq(t.closure_reason, 'administrative_closure', 'closure reason');
  });
}

/**
 * A check that cannot fail is not a check. Corrupt three invariants and confirm
 * the verification script reports exactly those, then discard the database.
 */
async function mutationTest() {
  console.log('\nMutation test: corrupting three invariants on purpose...');
  await db.exec(`
    UPDATE public.tickets SET reopened_count = reopened_count + 3;
    UPDATE public.tickets SET resolve_due_at = resolve_due_at + INTERVAL '1 day';
    UPDATE public.tickets SET status = 'closed', closure_reason = NULL WHERE status = 'resolved';
  `);

  const sql = readFileSync(join(root, 'supabase/verify/alignment_checks.sql'), 'utf8');
  const { rows } = await db.query(sql);
  const failedNames = new Set(rows.filter((r) => r.result === 'FAIL').map((r) => r.check_name));

  const expected = [
    'legacy staff-closed tickets were migrated',
    'reopened_count matches the audit trail',
    'due dates match the priority targets',
  ];
  const missed = expected.filter((n) => !failedNames.has(n));

  console.log(`  verifier reported ${failedNames.size} failing invariant(s)`);
  for (const n of failedNames) console.log(`    FAIL  ${n}`);
  if (missed.length) {
    console.log(`  MISSED (the check did not notice corruption): ${missed.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('  all three corruptions were detected.');
  }
}

try {
  await main();
} catch (err) {
  console.error(`\nERROR: ${err.message}`);
  process.exitCode = 1;
}
await db.close();
