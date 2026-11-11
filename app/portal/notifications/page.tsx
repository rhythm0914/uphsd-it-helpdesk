import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDateTime } from "@/utils/format-date";
import { SubmitButton } from "@/components/ui/submit-button";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export const dynamic = "force-dynamic";

interface NotificationRow {
  id: string;
  ticket_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const actionError = params?.error ? decodeURIComponent(params.error) : null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=%2Fportal%2Fnotifications");
  }

  // RLS already limits rows to the signed-in user; the filter is explicit so
  // the page keeps working if a future policy widens the table.
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (notifications || []) as NotificationRow[];
  const unread = rows.filter((row) => !row.read_at).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-foreground/60">
            {unread > 0 ? `${unread} unread` : "You are all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <SubmitButton
              idleLabel="Mark all as read"
              pendingLabel="Updatingâ€¦"
              variant="outline"
            />
          </form>
        )}
      </div>

      {(actionError || error) && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{actionError || error?.message}</p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background">
        {rows.length > 0 ? (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`px-6 py-4 ${row.read_at ? "" : "bg-brand-primary/5"}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{row.title}</p>
                      {!row.read_at && (
                        <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          New
                        </span>
                      )}
                    </div>
                    {row.body && (
                      <p className="mt-1 text-sm text-foreground/70 whitespace-pre-wrap">
                        {row.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-foreground/50">
                      {formatDateTime(row.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    {row.ticket_id && (
                      <Link
                        href={`/portal/tickets/${row.ticket_id}`}
                        className="text-sm font-medium text-brand-primary hover:text-brand-primary-hover"
                      >
                        Open request
                      </Link>
                    )}
                    {!row.read_at && (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          className="text-sm text-foreground/60 hover:text-foreground"
                        >
                          Mark read
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-foreground/60">No notifications yet.</p>
            <Link
              href="/portal"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
            >
              Back to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

