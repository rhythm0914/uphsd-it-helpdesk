import { getReports } from "./actions";
import { statusBadgeClass, statusLabel } from "@/utils/tickets/constants";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Reports & Analytics</h1>
        <p className="mt-1 text-foreground/60">
          System performance and ticket analytics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm text-foreground/60">Total Tickets</p>
          <p className="text-3xl font-semibold mt-2">{reports.totalTickets}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm text-foreground/60">Avg. Resolution Time</p>
          <p className="text-3xl font-semibold mt-2">{reports.avgResolutionTime} days</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm text-foreground/60">Open Tickets</p>
          <p className="text-3xl font-semibold mt-2">{reports.ticketsByStatus.open || 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm text-foreground/60">Resolved Tickets</p>
          <p className="text-3xl font-semibold mt-2">{reports.ticketsByStatus.resolved || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-lg font-semibold mb-4">Tickets by Status</h2>
          <div className="space-y-3">
            {Object.entries(reports.ticketsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadgeClass(status)}`}>
                  {statusLabel(status, { short: true })}
                </span>
                <span className="text-sm font-medium">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-lg font-semibold mb-4">Tickets by Priority</h2>
          <div className="space-y-3">
            {Object.entries(reports.ticketsByPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{priority}</span>
                <span className="text-sm font-medium">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="text-lg font-semibold mb-4">Monthly Ticket Volume (Last 30 Days)</h2>
        <div className="space-y-3">
          {Object.entries(reports.monthlyData).map(([month, count]) => (
            <div key={month} className="flex items-center justify-between">
              <span className="text-sm font-medium">{month}</span>
              <span className="text-sm font-medium">{count as number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
