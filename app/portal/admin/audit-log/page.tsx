import { getAuditLog } from "./actions";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string; start?: string; end?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const pageSize = 50;

  const reports = await getAuditLog({
    page,
    pageSize,
    action: params.action,
    actorId: params.actor,
    startDate: params.start,
    endDate: params.end,
  });

  const totalPages = Math.ceil(reports.total / pageSize);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">System Audit Log</h1>
        <p className="mt-1 text-foreground/60">
          Security-relevant and administrative events. Append-only — nothing here
          can be edited or deleted.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 mb-8">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-4" action="" method="get">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Action contains</label>
            <input
              name="action"
              defaultValue={params.action || ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Actor ID</label>
            <input
              name="actor"
              defaultValue={params.actor || ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">From date</label>
            <input
              name="start"
              type="date"
              defaultValue={params.start || ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">To date</label>
            <input
              name="end"
              type="date"
              defaultValue={params.end || ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <div className="flex items-end">
            <button
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {reports.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
          <p className="text-sm text-red-700">{reports.error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-background/50">
              <th className="px-4 py-3 text-left text-foreground/60 font-medium">Time</th>
              <th className="px-4 py-3 text-left text-foreground/60 font-medium">Actor</th>
              <th className="px-4 py-3 text-left text-foreground/60 font-medium">Role</th>
              <th className="px-4 py-3 text-left text-foreground/60 font-medium">Action</th>
              <th className="px-4 py-3 text-left text-foreground/60 font-medium">Target</th>
              <th className="px-4 py-3 text-left text-foreground/60 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.auditLog.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-foreground/60">
                  No audit log entries found.
                </td>
              </tr>
            ) : (
              reports.auditLog.map((row) => (
                <tr key={row.id} className="hover:bg-background/30 transition-colors">
                  <td className="px-4 py-3 text-foreground/60 font-mono text-xs">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{row.actor_name}</td>
                  <td className="px-4 py-3 text-foreground/60 text-xs capitalize">
                    {row.actor_role}
                  </td>
                  <td className="px-4 py-3 font-medium capitalize">{row.action.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-foreground/60 text-xs">
                    {row.target_type}
                    {row.target_id ? ` · ${row.target_id}` : ""}
                  </td>
                  <td className="px-4 py-3 text-foreground/60 text-xs">
                    {row.details && Object.keys(row.details).length > 0 ? (
                      <span className="font-mono">{JSON.stringify(row.details)}</span>
                    ) : (
                      <span className="text-foreground/40">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {reports.total > pageSize && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-foreground/60">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, reports.total)} of {reports.total} entries
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?action=${params.action || ""}&actor=${params.actor || ""}&start=${params.start || ""}&end=${params.end || ""}&page=${page - 1}`}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?action=${params.action || ""}&actor=${params.actor || ""}&start=${params.start || ""}&end=${params.end || ""}&page=${page + 1}`}
                className="rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-medium text-white focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
