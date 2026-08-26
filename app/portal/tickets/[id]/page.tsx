import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
    </div>
  );
}
