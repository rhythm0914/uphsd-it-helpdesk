import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/utils/format-date";
import { statusBadgeClass, statusLabel } from "@/utils/tickets/constants";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=%2Fportal");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const userMetadata: Record<string, unknown> =
    (user.user_metadata as Record<string, unknown>) || {};
  const metadataRole = String(userMetadata.role || "student");
  const fallbackRole = ["student", "employee", "it_staff", "admin", "manager"].includes(
    metadataRole,
  )
    ? metadataRole
    : "student";

  const resolvedProfile =
    profile ??
    {
      id: user.id,
      email: user.email,
      full_name: userMetadata.full_name || "User",
      role: fallbackRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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

  const { data: recentTickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

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
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome, {resolvedProfile?.full_name || "User"}
        </h1>
        <p className="mt-1 text-foreground/60">
          {resolvedProfile?.role === "student"
            ? "Student"
            : resolvedProfile?.role === "employee"
              ? "Employee"
              : "User"}{" "}
          Portal
        </p>
      </div>

      <div className="mb-8">
        <Link
          href="/portal/request"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-medium text-on-primary hover:text-on-primary transition-colors hover:bg-primary-hover"
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
          <p className="text-sm text-foreground/60">Assigned / In Progress</p>
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
            recentTickets.map((ticket) => (
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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadgeClass(ticket.status)}`}
                    >
                      {statusLabel(ticket.status, { short: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium truncate">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-foreground/50">
                    Created {formatDate(ticket.created_at)}
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
                className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:text-on-primary transition-colors hover:bg-primary-hover"
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

