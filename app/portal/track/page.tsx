import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDateTime } from "@/utils/format-date";
import { statusBadgeClass, statusLabel } from "@/utils/tickets/constants";

export const dynamic = "force-dynamic";

interface TrackedTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

/**
 * Track Request â€” the page the public FAQ and the sign-in flow point at.
 *
 * Ownership is enforced twice: RLS limits readable rows to the requester's own
 * tickets (or staff), and the query is additionally filtered by requester_id so
 * staff browsing this page still only see their own submissions. A search for
 * someone else's Request ID therefore returns "not found", exactly like a
 * random string â€” the ID's existence is never leaked.
 */
export default async function TrackRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params?.q || "").trim();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=%2Fportal%2Ftrack");
  }

  const baseQuery = supabase
    .from("tickets")
    .select("id, ticket_number, subject, status, priority, created_at, updated_at")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  const { data, error } = query
    ? await baseQuery.ilike("ticket_number", query.replace(/[%_]/g, ""))
    : await baseQuery;

  const tickets = (data || []) as TrackedTicket[];
  const searched = query.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Track a request</h1>
        <p className="mt-2 text-foreground/60">
          Enter the Request ID from your confirmation (for example{" "}
          <span className="font-mono">IT-2026-000123</span>) or pick one of your
          recent requests below.
        </p>
      </div>

      <form method="get" className="mb-8 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="q" className="sr-only">
          Request ID
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="IT-2026-000123"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
        >
          Track
        </button>
      </form>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            We could not load your requests right now. Please try again.
          </p>
        </div>
      )}

      {searched && tickets.length === 0 && !error && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-foreground/70">
            No request with that ID belongs to your account. Check the ID and try
            again, or browse your requests below.
          </p>
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold">
        {searched ? "Matching requests" : "My requests"}
      </h2>

      <div className="rounded-2xl border border-border bg-background">
        {tickets.length > 0 ? (
          <ul className="divide-y divide-border">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="px-6 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-foreground/60">
                        {ticket.ticket_number}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(ticket.status)}`}
                      >
                        {statusLabel(ticket.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-foreground/50">
                      Updated {formatDateTime(ticket.updated_at)}
                    </p>
                  </div>
                  <Link
                    href={`/portal/tickets/${ticket.id}`}
                    className="flex-none text-sm font-medium text-brand-primary hover:text-brand-primary-hover"
                  >
                    View request
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-foreground/60">No requests yet.</p>
            <Link
              href="/portal/request"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
            >
              Submit a request
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

