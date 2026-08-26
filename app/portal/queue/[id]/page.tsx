import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TicketManagement } from "../[id]/ticket-management";
import { getITStaff } from "@/app/portal/queue/lib";

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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/auth/sign-in");
  }

  const role = profile.role;
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

  const { staff } = await getITStaff();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "in_progress":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "resolved":
        return "bg-green-50 text-green-700 border-green-200";
      case "closed":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "waiting_for_user":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600 font-medium";
      case "high":
        return "text-orange-600 font-medium";
      case "normal":
        return "text-foreground";
      case "low":
        return "text-foreground/60";
      default:
        return "text-foreground";
    }
  };

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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace(/_/g, " ")}
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
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Last Updated</p>
                <p className="mt-1 text-sm font-medium">
                  {new Date(ticket.updated_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-sm text-foreground/70 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {ticket.assigned_to_profile && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-2">Assigned To</h2>
                <p className="text-sm text-foreground/70">
                  {ticket.assigned_to_profile.full_name || ticket.assigned_to_profile.email}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
            <h2 className="text-lg font-semibold mb-4">Status History</h2>
            <div className="space-y-4">
              {statusHistory && statusHistory.length > 0 ? (
                statusHistory.map((history: any) => (
                  <div key={history.id} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(history.new_status)}`}>
                        {history.new_status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground/70">
                        {history.notes || `Status changed from ${history.old_status?.replace(/_/g, " ") || "none"} to ${history.new_status.replace(/_/g, " ")}`}
                      </p>
                      <p className="mt-1 text-xs text-foreground/50">
                        {history.changed_by_profile?.full_name || "System"} • {new Date(history.created_at).toLocaleString()}
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
            <h2 className="text-lg font-semibold mb-4">Work Remarks</h2>
            <div className="space-y-4">
              {messages && messages.length > 0 ? (
                messages.map((msg: any) => (
                  <div key={msg.id} className="border-b border-border pb-4 last:border-0">
                    <p className="text-sm text-foreground/70">{msg.message}</p>
                    <p className="mt-1 text-xs text-foreground/50">
                      {msg.sender?.full_name || "Unknown"} • {new Date(msg.created_at).toLocaleString()}
                      {msg.is_internal && <span className="ml-2 text-amber-600">(Internal)</span>}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground/60">No remarks yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <TicketManagement ticketId={ticket.id} staff={staff} currentStatus={ticket.status} />
        </div>
      </div>
    </div>
  );
}
