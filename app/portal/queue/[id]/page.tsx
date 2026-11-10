import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TicketManagement } from "../[id]/ticket-management";
import { getITStaff } from "@/app/portal/queue/lib";
import { formatDateTime } from "@/utils/format-date";
import { statusBadgeClass, statusLabel } from "@/utils/tickets/constants";
import { deriveSlaState, slaStateBadgeClass, slaStateLabel } from "@/utils/tickets/sla";
import { CycleHistory } from "@/components/tickets/cycle-history";

interface TicketStatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
  changed_by_profile?: { full_name: string | null } | null;
}

interface TicketMessage {
  id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  sender?: { full_name: string | null } | null;
}

export const dynamic = "force-dynamic";

export default async function ITQueueTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  let profile = null;
  let role: string | null = null;

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  profile = profileData;

  // A missing/unreadable profile must NOT redirect to /auth/sign-in (that
  // recreates the auth redirect loop for an authenticated user). Fall back to
  // the least-privilege behavior: no staff role -> redirected to /portal.
  role = profile?.role || null;
  if (role !== "it_staff" && role !== "admin" && role !== "manager") {
    redirect("/portal");
  }

  const { id } = await params;

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select(`
      *,
      service:services(*),
      category:ticket_categories(*),
      requester_profile:profiles!requester_id(id, full_name, email, department, student_number, employee_id),
      assigned_to_profile:profiles!assigned_to(id, full_name, email)
    `)
    .eq("id", id)
    .single();

  if (ticketError || !ticket) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-border bg-background p-8 text-center">
          <h1 className="text-2xl font-semibold">Ticket Not Found</h1>
          <p className="mt-2 text-foreground/60">
            The ticket you are looking for does not exist or you do not have permission to view it.
          </p>
          <Link
            href="/portal/queue"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  const { data: statusHistory } = await supabase
    .from("ticket_status_history")
    .select(`
      *,
      changed_by_profile:profiles!changed_by(id, full_name, email)
    `)
    .eq("ticket_id", id)
    .order("created_at", { ascending: false });

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select(`
      *,
      sender:profiles!sender_id(id, full_name, email)
    `)
    .eq("ticket_id", id)
    .order("created_at", { ascending: false });

  // Per-cycle work history: a reopened ticket keeps every previous attempt.
  const { data: cycles } = await supabase
    .from("ticket_cycles")
    .select("id, cycle_number, started_at, resolved_at, ended_at, outcome")
    .eq("ticket_id", id)
    .order("cycle_number", { ascending: true });

  const { staff } = await getITStaff();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600 font-medium";
      case "high":
        return "text-orange-600 font-medium";
      case "medium":
        return "text-foreground";
      case "low":
        return "text-foreground/60";
      default:
        return "text-foreground";
    }
  };

  // SLA health is derived from the stored due date, so this page never
  // recomputes targets and can never disagree with the escalation job.
  const slaState = ticket.resolve_due_at
    ? deriveSlaState(
        new Date(ticket.sla_started_at || ticket.created_at),
        new Date(ticket.resolve_due_at),
      )
    : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/portal/queue"
          className="text-sm text-brand-primary hover:text-brand-primary-hover transition-colors"
        >
          ← Back to Queue
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm text-foreground/60">
                    {ticket.ticket_number}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadgeClass(ticket.status)}`}>
                    {statusLabel(ticket.status)}
                  </span>
                </div>
                <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <span className={`text-sm ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority.toUpperCase()} PRIORITY
                </span>
                {slaState && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${slaStateBadgeClass(slaState)}`}
                  >
                    {slaStateLabel(slaState)}
                    {ticket.resolve_due_at &&
                      ` · resolve by ${formatDateTime(ticket.resolve_due_at)}`}
                  </span>
                )}
                {ticket.escalation_level > 0 && (
                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    Escalated to supervisor
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-sm text-foreground/60">Requester</p>
                <p className="mt-1 text-sm font-medium">{ticket.requester_profile?.full_name || "Unknown"}</p>
                <p className="text-xs text-foreground/50">{ticket.requester_profile?.email}</p>
                {ticket.requester_profile?.department && (
                  <p className="text-xs text-foreground/50">{ticket.requester_profile.department}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-foreground/60">Service</p>
                <p className="mt-1 text-sm font-medium">{ticket.service?.name || "N/A"}</p>
                <p className="text-xs text-foreground/50">{ticket.category?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Created</p>
                <p className="mt-1 text-sm font-medium">
                  {formatDateTime(ticket.created_at)}
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Last Updated</p>
                <p className="mt-1 text-sm font-medium">
                  {formatDateTime(ticket.updated_at)}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-sm text-foreground/70 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {ticket.priority === "urgent" && ticket.priority_justification && (
              <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  Declared urgent by the requester
                </p>
                <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">
                  {ticket.priority_justification}
                </p>
              </div>
            )}

            {ticket.assigned_to_profile ? (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-2">Assigned To</h2>
                <p className="text-sm text-foreground/70">
                  {ticket.assigned_to_profile.full_name || ticket.assigned_to_profile.email}
                </p>
              </div>
            ) : (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-2">Assigned To</h2>
                <p className="text-sm text-foreground/50">Unassigned</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
            {cycles && cycles.length > 0 && <CycleHistory cycles={cycles} />}
            <h2 className="text-lg font-semibold mb-4">Status History</h2>
            <div className="space-y-4">
              {statusHistory && statusHistory.length > 0 ? (
                statusHistory.map((history: TicketStatusHistory) => (
                  <div key={history.id} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadgeClass(history.new_status)}`}>
                        {statusLabel(history.new_status)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground/70">
                        {history.notes || `Status changed from ${history.old_status?.replace(/_/g, " ") || "none"} to ${history.new_status.replace(/_/g, " ")}`}
                      </p>
                      <p className="mt-1 text-xs text-foreground/50">
                        {history.changed_by_profile?.full_name || "System"} • {formatDateTime(history.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground/60">No status history yet</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
            <h2 className="text-lg font-semibold mb-4">Conversation</h2>
            <div className="space-y-4">
              {messages && messages.filter((msg: TicketMessage) => !msg.is_internal).length > 0 ? (
                messages
                  .filter((msg: TicketMessage) => !msg.is_internal)
                  .map((msg: TicketMessage) => (
                    <div key={msg.id} className="border-b border-border pb-4 last:border-0">
                      <p className="text-sm text-foreground/70">{msg.message}</p>
                      <p className="mt-1 text-xs text-foreground/50">
                        {msg.sender?.full_name || "Unknown"} • {formatDateTime(msg.created_at)}
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-foreground/60">No public replies yet</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 md:p-8">
            <h2 className="text-lg font-semibold mb-4">
              Internal Notes{" "}
              <span className="text-sm font-normal text-amber-700">
                (visible to IT staff, managers & admins only)
              </span>
            </h2>
            <div className="space-y-4">
              {messages && messages.filter((msg: TicketMessage) => msg.is_internal).length > 0 ? (
                messages
                  .filter((msg: TicketMessage) => msg.is_internal)
                  .map((msg: TicketMessage) => (
                    <div key={msg.id} className="border-b border-amber-200 pb-4 last:border-0">
                      <p className="text-sm text-foreground/70">{msg.message}</p>
                      <p className="mt-1 text-xs text-amber-600">
                        {msg.sender?.full_name || "Unknown"} • {formatDateTime(msg.created_at)} •
                        Internal
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-foreground/60">No internal notes yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <TicketManagement
            ticketId={ticket.id}
            staff={staff}
            currentStatus={ticket.status}
            currentPriority={ticket.priority}
          />
        </div>
      </div>
    </div>
  );
}
