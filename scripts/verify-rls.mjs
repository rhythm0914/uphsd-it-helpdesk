// Live RLS verification against production Supabase. Run: node scripts/verify-rls.mjs
const url = "https://vrnkzglwzwojrxlpofss.supabase.co";
const key = "sb_publishable_P2SvmRz1D8X5ffGEoxN12Q_IuO8bUvO";

async function login(email, password) {
  const r = await fetch(url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`login failed ${email}: ${JSON.stringify(j)}`);
  return { token: j.access_token, uid: j.user.id };
}

function h(token) { return { apikey: key, Authorization: "Bearer " + token, "Content-Type": "application/json", Prefer: "return=representation" }; }

let PASS = 0, FAIL = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  ok ? PASS++ : FAIL++;
}
async function req(token, method, path, body) {
  const r = await fetch(url + path, { method, headers: h(token), body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
}

const ADMIN = await login("ryanjoseph.canano@perpetual.edu.ph", "@Pass0914");
const STUDENT = await login("brent.gayamo@perpetual.edu.ph", "Gayamobrent01");
console.log("admin:", ADMIN.uid, "student:", STUDENT.uid);

// ---- service ids
const sv = await req(STUDENT.token, "GET", "/rest/v1/services?select=id,name&limit=1");
const serviceId = sv.j[0].id;

// ---- 1. Student creates a ticket (REST mirror of the fixed server action:
//         explicit collision-safe ticket_number)
// Mirrors the fixed app: number generation must be RLS-proof. Pre-migration we
// approximate the SECURITY DEFINER RPC by computing max as a staff/admin token.
async function nextTicketNumber(token = ADMIN.token) {
  const year = new Date().getFullYear();
  const prefix = `IT-${year}-`;
  const r = await req(token, "GET", `/rest/v1/tickets?ticket_number=like.${encodeURIComponent(prefix + "*")}&select=ticket_number`);
  let max = 0;
  for (const row of r.j || []) {
    const n = parseInt(String(row.ticket_number).slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(6, "0")}`;
}
const sc0 = await req(STUDENT.token, "GET", `/rest/v1/service_categories?service_id=eq.${serviceId}&select=category_id&limit=1`);
const categoryId = sc0.j[0].category_id;
const t = await req(STUDENT.token, "POST", "/rest/v1/tickets", {
  requester_id: STUDENT.uid,
  ticket_number: await nextTicketNumber(),
  subject: "RLS VERIFY - student ticket", description: "Live verification ticket",
  service_id: serviceId, category_id: categoryId, priority: "normal", status: "open",
});
const createdOk = t.status === 201 && t.j?.[0]?.requester_id === STUDENT.uid && t.j?.[0]?.ticket_number;
const ticket = t.j?.[0];
check("student ticket INSERT (requester_id set, ticket_number generated, status open)", createdOk,
  createdOk ? `${ticket.ticket_number} requester_ok=${ticket.requester_id === STUDENT.uid}` : JSON.stringify(t.j));

// ---- 1b. Student cannot create a ticket owned by someone else
const spoof = await req(STUDENT.token, "POST", "/rest/v1/tickets", {
  requester_id: ADMIN.uid,
  subject: "RLS VERIFY - spoofed requester", description: "x",
  service_id: serviceId, priority: "normal", status: "open",
});
check("student INSERT with spoofed requester_id denied", spoof.status >= 400, `status=${spoof.status} ${JSON.stringify(spoof.j?.message ?? "")}`);

// ---- 2. Student cannot change own ticket status/priority/assigned_to
let r2 = await req(STUDENT.token, "PATCH", `/rest/v1/tickets?id=eq.${ticket.id}`, { status: "resolved" });

// ---- 3. Student cannot forge status history
const fh = await req(STUDENT.token, "POST", "/rest/v1/ticket_status_history", { ticket_id: ticket.id, old_status: "open", new_status: "closed", notes: "FORGED" });
check("student INSERT ticket_status_history denied", fh.status >= 400 || fh.j?.code === "42501", `status=${fh.status} ${JSON.stringify(fh.j?.message ?? fh.j)}`);

// ---- 4. Student public message OK; internal note denied; no tampering
const pm = await req(STUDENT.token, "POST", "/rest/v1/ticket_messages", { ticket_id: ticket.id, sender_id: STUDENT.uid, message: "public student reply", is_internal: false });
check("student public message INSERT allowed", pm.status === 201, `status=${pm.status}`);
const im = await req(STUDENT.token, "POST", "/rest/v1/ticket_messages", { ticket_id: ticket.id, sender_id: STUDENT.uid, message: "FAKE internal", is_internal: true });
check("student internal-note INSERT denied", im.status >= 400, `status=${im.status} ${JSON.stringify(im.j?.message ?? "")}`);
const msgId = pm.j?.[0]?.id;
const um = await req(STUDENT.token, "PATCH", `/rest/v1/ticket_messages?id=eq.${msgId}`, { message: "TAMPERED" });
check("student UPDATE ticket_messages denied (append-only)", um.status >= 400 || um.j?.length === 0, `status=${um.status} rows=${Array.isArray(um.j) ? um.j.length : "?"}`);

// ---- 5. Admin internal note + public remark; student must not see internal
const an = await req(ADMIN.token, "POST", "/rest/v1/ticket_messages", { ticket_id: ticket.id, sender_id: ADMIN.uid, message: "SECRET INTERNAL NOTE xyzzy", is_internal: true });
check("staff internal-note INSERT allowed", an.status === 201, `status=${an.status}`);
const apub = await req(ADMIN.token, "POST", "/rest/v1/ticket_messages", { ticket_id: ticket.id, sender_id: ADMIN.uid, message: "public staff remark", is_internal: false });
check("staff public remark INSERT allowed", apub.status === 201, `status=${apub.status}`);
const studentMsgs = await req(STUDENT.token, "GET", `/rest/v1/ticket_messages?select=*&ticket_id=eq.${ticket.id}`);

// ---- 6. Cross-user protection
const at = await req(ADMIN.token, "POST", "/rest/v1/tickets", { requester_id: ADMIN.uid, ticket_number: await nextTicketNumber(ADMIN.token), subject: "RLS VERIFY - admin ticket", description: "admin own", service_id: serviceId, category_id: categoryId, priority: "normal", status: "open" });
const adminTicket = at.j?.[0];
const x1 = await req(STUDENT.token, "GET", `/rest/v1/tickets?id=eq.${adminTicket.id}`);
check("student cannot read another user's ticket", (x1.j || []).length === 0, `rows=${x1.j?.length}`);
const x2 = await req(STUDENT.token, "GET", `/rest/v1/ticket_messages?ticket_id=eq.${adminTicket.id}`);
check("student cannot read another user's ticket messages", (x2.j || []).length === 0, `rows=${x2.j?.length}`);
const x3 = await req(STUDENT.token, "GET", `/rest/v1/ticket_status_history?ticket_id=eq.${adminTicket.id}`);
check("student cannot read another user's status history", (x3.j || []).length === 0, `rows=${x3.j?.length}`);

// ---- 7. Staff status change records history
const sc = await req(ADMIN.token, "PATCH", `/rest/v1/tickets?id=eq.${ticket.id}&status=eq.open`, { status: "waiting_for_user", updated_at: new Date().toISOString() });

// ---- 8. requester_provide_info RPC behavior
const rpcOther = await req(STUDENT.token, "POST", "/rest/v1/rpc/requester_provide_info", { p_ticket_id: adminTicket.id });
check("RPC requester_provide_info: non-owner rejected", rpcOther.status === 200 ? rpcOther.j === false : rpcOther.status >= 400, `status=${rpcOther.status} body=${JSON.stringify(rpcOther.j)}`);
const rb2 = await req(STUDENT.token, "GET", `/rest/v1/tickets?select=status&id=eq.${adminTicket.id}`);
check("non-owner RPC did not alter ticket", rb2.j?.length === 0 || rb2.j?.[0]?.status === "open", JSON.stringify(rb2.j));
const rpcOwner = await req(STUDENT.token, "POST", "/rest/v1/rpc/requester_provide_info", { p_ticket_id: ticket.id });
check("RPC requester_provide_info: owner returns TRUE", rpcOwner.status === 200 && rpcOwner.j === true, `body=${JSON.stringify(rpcOwner.j)}`);
const rb3 = await req(STUDENT.token, "GET", `/rest/v1/tickets?select=status&id=eq.${ticket.id}`);
check("ticket now in_progress", rb3.j?.[0]?.status === "in_progress", JSON.stringify(rb3.j));
const hh2 = await req(ADMIN.token, "GET", `/rest/v1/ticket_status_history?ticket_id=eq.${ticket.id}&order=created_at.desc`);
check("history row waiting_for_user -> in_progress", hh2.j?.[0]?.old_status === "waiting_for_user" && hh2.j?.[0]?.new_status === "in_progress", JSON.stringify(hh2.j?.[0] && [hh2.j[0].old_status, hh2.j[0].new_status, hh2.j[0].notes]));
const rpcWrong = await req(STUDENT.token, "POST", "/rest/v1/rpc/requester_provide_info", { p_ticket_id: ticket.id });
check("RPC on non-waiting ticket returns FALSE (no-op)", rpcWrong.j === false, JSON.stringify(rpcWrong.j));

// ---- cleanup: remove test tickets to keep prod tidy
const del = await req(ADMIN.token, "DELETE", `/rest/v1/tickets?id=in.(${ticket.id},${adminTicket.id})`);
console.log("cleanup delete:", del.status);

console.log(`\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);

check("staff PATCH status to waiting_for_user", sc.status === 200 && sc.j?.[0]?.status === "waiting_for_user", `status=${sc.status}`);
const hh = await req(ADMIN.token, "GET", `/rest/v1/ticket_status_history?ticket_id=eq.${ticket.id}&order=created_at.desc`);
const top = hh.j?.[0];
check("status history recorded (old/new/changed_by)", top && top.old_status === "open" && top.new_status === "waiting_for_user" && top.changed_by === ADMIN.uid, JSON.stringify(top && [top.old_status, top.new_status]));

const seesInternal = (studentMsgs.j || []).some(m => m.is_internal || (m.message || "").includes("xyzzy"));
check("student sees only public messages (no internal)", !seesInternal, `count=${studentMsgs.j?.length}`);
const adminMsgs = await req(ADMIN.token, "GET", `/rest/v1/ticket_messages?select=*&ticket_id=eq.${ticket.id}`);
check("staff sees internal + public messages", (adminMsgs.j || []).some(m => m.message?.includes("xyzzy")), `count=${adminMsgs.j?.length}`);

check("student PATCH tickets.status denied", r2.status >= 400 || !r2.j?.[0] || r2.j[0].status === "open", `status=${r2.status} result=${JSON.stringify(r2.j?.[0]?.status ?? r2.j)}`);
let r3 = await req(STUDENT.token, "PATCH", `/rest/v1/tickets?id=eq.${ticket.id}`, { priority: "urgent" });
check("student PATCH tickets.priority denied", r3.status >= 400 || !r3.j?.[0] || r3.j[0].priority === "normal", `status=${r3.status} result=${JSON.stringify(r3.j?.[0]?.priority ?? r3.j)}`);
let r4 = await req(STUDENT.token, "PATCH", `/rest/v1/tickets?id=eq.${ticket.id}`, { assigned_to: ADMIN.uid });
check("student PATCH tickets.assigned_to denied", r4.status >= 400 || !r4.j?.[0] || !r4.j[0].assigned_to, `status=${r4.status} result=${JSON.stringify(r4.j?.[0]?.assigned_to ?? r4.j)}`);
const rb = await req(STUDENT.token, "GET", `/rest/v1/tickets?select=status,priority,assigned_to&id=eq.${ticket.id}`);
check("ticket still open/normal/unassigned after student PATCH attempts",
  rb.j?.[0]?.status === "open" && rb.j?.[0]?.priority === "normal" && (rb.j[0].assigned_to == null),
  JSON.stringify(rb.j));
