import { getITQueue, getServices } from "./lib";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/utils/format-date";
import type { Service, TicketWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ITQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; service_id?: string; search?: string }>;
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

  const params = await searchParams;
  const filters = {
    status: params?.status || "all",
    priority: params?.priority || "all",
    service_id: params?.service_id || "all",
    search: params?.search || "",
  };

  const [ticketsResult, servicesResult] = await Promise.all([
    getITQueue(filters),
    getServices(),
  ]);

  const tickets: TicketWithRelations[] = (ticketsResult.tickets || []) as TicketWithRelations[];
  const ticketsError = ticketsResult.error;
  const services: Service[] = (servicesResult.services || []) as Service[];

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
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">IT Staff Queue</h1>
        <p className="mt-1 text-foreground/60">
          Manage and process support requests
        </p>
      </div>

      {ticketsError && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{ticketsError}</p>
        </div>
      )}

      <div className="mb-6">
        <form method="get" className="flex flex-col md:flex-row gap-4">
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_for_user">Waiting for User</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            name="priority"
            defaultValue={filters.priority}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            name="service_id"
            defaultValue={filters.service_id}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="all">All Services</option>
            {services.map((service: Service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="search"
            placeholder="Search tickets..."
            defaultValue={filters.search}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />

          <button
            type="submit"
            className="rounded-full bg-brand-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Filter
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Ticket</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Requester</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Service</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Priority</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Assigned To</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets && tickets.length > 0 ? (
                tickets.map((ticket: TicketWithRelations) => (
                  <tr key={ticket.id} className="hover:bg-surface transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/portal/tickets/${ticket.id}`} className="block">
                        <span className="font-mono text-sm text-brand-primary hover:text-brand-primary-hover">
                          {ticket.ticket_number}
                        </span>
                        <p className="mt-1 text-sm font-medium truncate max-w-xs">
                          {ticket.subject}
                        </p>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{ticket.requester?.full_name || "Unknown"}</p>
                      <p className="text-xs text-foreground/50">{ticket.requester?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{ticket.service?.name || "N/A"}</p>
                      <p className="text-xs text-foreground/50">{ticket.category?.name || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{ticket.assigned_to_profile?.full_name || "Unassigned"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground/60">
                        {formatDate(ticket.created_at)}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <p className="text-sm text-foreground/60">No tickets found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
