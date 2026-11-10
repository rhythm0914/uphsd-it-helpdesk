import { createClient } from "@/utils/supabase/server";
import { formatDateTime } from "@/utils/format-date";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TicketReply } from "./ticket-reply";
import { TicketVerification } from "./ticket-verification";
import { CycleHistory } from "@/components/tickets/cycle-history";
import { daysUntilAutoClose } from "@/utils/jobs/no-response";
import {
  REJECTION_CATEGORY_LABELS,
  closureReasonLabel,
  isRejectionCategory,
  statusBadgeClass,
  statusLabel,
} from "@/utils/tickets/constants";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
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

  const { id } = await params;

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(`
      *,
      service:services(*),
      category:ticket_categories(*),
      assigned_to_profile:profiles!assigned_to(id, full_name, email),
      requester_profile:profiles!requester_id(id, full_name, email)
    `)
    .eq("id", id)
    .single();

  if (error || !ticket) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-border bg-background p-8 text-center">
          <h1 className="text-2xl font-semibold">Ticket Not Found</h1>
          <p className="mt-2 text-foreground/60">
            The ticket you are looking for does not exist or you do not have permission to view it.
          </p>
          <Link
            href="/portal"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Conversation (public messages only — RLS hides internal notes from the
  // requester automatically) and audit trail for this ticket.
  const { data: messages } = await supabase
    .from("ticket_messages")
    .select(`*, sender:profiles!sender_id(id, full_name, email)`)
    .eq("ticket_id", id)
    .order("created_at", { ascending: false });

  const { data: statusHistory } = await supabase
    .from("ticket_status_history")
    .select(`*, changed_by_profile:profiles!changed_by(id, full_name, email)`)
    .eq("ticket_id", id)
    .order("created_at", { ascending: false });

  // Per-cycle work history: a reopened ticket keeps every previous attempt.
  const { data: cycles } = await supabase
    .from("ticket_cycles")
    .select("id, cycle_number, started_at, resolved_at, ended_at, outcome")
    .eq("ticket_id", id)
    .order("cycle_number", { ascending: true });

  const isWaitingForUser = ticket.status === "waiting_for_user";
  const autoCloseDays = daysUntilAutoClose({
    status: ticket.status,
    resolvedAt: ticket.resolved_at,
    awaitingStudentSince: ticket.awaiting_student_since,
    reminderSentAt: ticket.reminder_sent_at,
  });

  // The row is untyped, so narrow it before indexing the label map.
  const rejectionCategory: unknown = ticket.rejection_category;
  const rejectionLabel = isRejectionCategory(rejectionCategory)
    ? REJECTION_CATEGORY_LABELS[rejectionCategory]
    : null;

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/portal"
          className="text-sm text-brand-primary hover:text-brand-primary-hover transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

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
          <span className={`text-sm ${getPriorityColor(ticket.priority)}`}>
            {ticket.priority.toUpperCase()} PRIORITY
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-sm text-foreground/60">Service</p>
            <p className="mt-1 text-sm font-medium">{ticket.service?.name || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/60">Category</p>
            <p className="mt-1 text-sm font-medium">{ticket.category?.name || "N/A"}</p>
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

        {ticket.status === "closed" && (
          <div className="mb-8 rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-medium">
              Closed
              {ticket.closure_reason
                ? ` — ${closureReasonLabel(ticket.closure_reason)}`
                : ""}
            </p>
            {ticket.closure_reason === "no_response" && (
              <p className="mt-1 text-sm text-foreground/60">
                This request was closed automatically after 5 days without a response. It is
                not recorded as a verified fix.
              </p>
            )}
          </div>
        )}

        {ticket.status === "rejected" && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">This request was rejected</p>
            {rejectionLabel && (
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-red-700">
                {rejectionLabel}
              </p>
            )}
            {ticket.rejection_reason && (
              <p className="mt-2 text-sm text-red-700 whitespace-pre-wrap">
                {ticket.rejection_reason}
              </p>
            )}
            <p className="mt-3 text-sm text-red-700">
              This request is closed and cannot be reopened. If you still need help, submit a new
              request.
            </p>
            <Link
              href="/portal/request"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
            >
              Submit a new request
            </Link>
          </div>
        )}

        {ticket.assigned_to_profile && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Assigned To</h2>
            <p className="text-sm text-foreground/70">
              {ticket.assigned_to_profile.full_name || ticket.assigned_to_profile.email}
            </p>
          </div>
        )}

        {isWaitingForUser && (
          <div className="mb-8 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-medium text-orange-800">
              IT staff is waiting for additional information from you. Please reply below with the
              requested details.
            </p>
            {autoCloseDays !== null && (
              <p className="mt-1 text-sm text-orange-700">
                {autoCloseDays > 0
                  ? `This request closes automatically in ${autoCloseDays} day${autoCloseDays === 1 ? "" : "s"} if there is no reply.`
                  : "This request is due to be closed automatically."}
              </p>
            )}
          </div>
        )}

        {ticket.status === "resolved" && autoCloseDays !== null && (
          <p className="mb-8 text-sm text-foreground/60">
            {autoCloseDays > 0
              ? `If you do not confirm the fix, this request closes automatically as No Response in ${autoCloseDays} day${autoCloseDays === 1 ? "" : "s"}. That is not recorded as a fix.`
              : "This request is due to close automatically as No Response."}
          </p>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Conversation</h2>
          {messages && messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className="text-sm font-medium">
                      {msg.sender?.full_name || msg.sender?.email || "User"}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {formatDateTime(msg.created_at)}
                    </p>
                  </div>
                  <p className="text-sm text-foreground/70 whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/60">No messages yet.</p>
          )}
        </div>

        {ticket.status === "resolved" && <TicketVerification ticketId={ticket.id} />}

        {ticket.status !== "closed" && ticket.status !== "rejected" && (
          <TicketReply ticketId={ticket.id} isWaitingForUser={isWaitingForUser} />
        )}

        <div className="mt-8">
          {cycles && cycles.length > 0 && <CycleHistory cycles={cycles} />}
          <h2 className="text-lg font-semibold mb-4">Status History</h2>
          {statusHistory && statusHistory.length > 0 ? (
            <ol className="space-y-2">
              {statusHistory.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-border bg-background px-4 py-3 text-sm"
                >
                  <span className="font-medium text-foreground/60">                      {statusLabel(entry.old_status, { short: true })} →{" "}
                      {statusLabel(entry.new_status, { short: true })}
                  </span>
                  <span className="text-foreground/50">
                    {" "}
                    · {entry.changed_by_profile?.full_name || entry.changed_by_profile?.email || "System"}
                    {" · "}
                    {formatDateTime(entry.created_at)}
                  </span>
                  {entry.notes && (
                    <p className="mt-1 text-foreground/70">{entry.notes}</p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-foreground/60">No status changes recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
