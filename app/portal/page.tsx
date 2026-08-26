import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default async function PortalPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch ticket counts
  const { count: openCount } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("requester_id", user.id)
    .eq("status", "open");

  const { count: inProgressCount } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("requester_id", user.id)
    .eq("status", "in_progress");

  const { count: resolvedCount } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("requester_id", user.id)
    .eq("status", "resolved");

  // Fetch recent tickets
  const { data: recentTickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

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
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome, {profile?.full_name || "User"}
        </h1>
        <p className="mt-1 text-foreground/60">
          {profile?.role === "student" ? "Student" : profile?.role === "employee" ? "Employee" : "User"} Portal
        </p>
      </div>

      <div className="mb-8">
        <Link
          href="/portal/request"
          className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
        >
          Submit a Request
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm text-foreground/60">Open Requests</p>
          <p className="text-3xl font-semibold mt-2">{openCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm text-foreground/60">In Progress</p>
          <p className="text-3xl font-semibold mt-2">{inProgressCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm text-foreground/60">Resolved</p>
          <p className="text-3xl font-semibold mt-2">{resolvedCount || 0}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Recent Requests</h2>
        </div>
        <div className="divide-y divide-border">
          {recentTickets && recentTickets.length > 0 ? (
            recentTickets.map((ticket: any) => (
              <Link
                key={ticket.id}
                href={`/portal/tickets/${ticket.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-surface transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-foreground/60">
                      {ticket.ticket_number}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium truncate">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-foreground/50">
                    Created {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-sm ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-foreground/60">No tickets yet</p>
              <Link
                href="/portal/request"
                className="mt-2 inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
              >
                Create your first request
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
