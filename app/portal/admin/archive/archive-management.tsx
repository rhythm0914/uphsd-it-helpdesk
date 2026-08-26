"use client";

import { useState } from "react";
import { getArchivedTickets, exportTickets } from "./actions";

export function ArchiveManagement() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
  });

  async function handleSearch(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await getArchivedTickets({
      status: formData.get("status") as string,
      dateFrom: formData.get("dateFrom") as string,
      dateTo: formData.get("dateTo") as string,
    });
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setTickets(result.tickets);
    }
    setLoading(false);
  }

  async function handleExport(format: "csv" | "json") {
    setLoading(true);
    setMessage(null);
    const result = await exportTickets(format);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      setLoading(false);
      return;
    }

    if (format === "json") {
      const blob = new Blob([JSON.stringify((result.data as any[]) || [], null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([result.data as string || ""], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setMessage({ type: "success", text: `Exported ${(result.data as any[]).length} tickets as ${format.toUpperCase()}` });
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-lg p-4 ${message.type === "error" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
          <p className={`text-sm ${message.type === "error" ? "text-red-700" : "text-green-700"}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Filter Archived Tickets</h3>
        <form action={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="all">All</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium mb-2">
                From
              </label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium mb-2">
                To
              </label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
              >
                {loading ? "Loading..." : "Search"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Export Data</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport("csv")}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport("json")}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50"
            >
              Export JSON
            </button>
          </div>
        </div>
        <p className="text-sm text-foreground/60">
          Export all resolved and closed tickets for reporting and backup purposes.
        </p>
      </div>

      {tickets.length > 0 && (
        <div className="rounded-2xl border border-border bg-background">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold">Results ({tickets.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Ticket</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Subject</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Requester</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-surface transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-brand-primary">{ticket.ticket_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium truncate max-w-xs">{ticket.subject}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border bg-surface capitalize">
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{ticket.requester?.full_name || "Unknown"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground/60">
                        {ticket.closed_at ? new Date(ticket.closed_at).toLocaleDateString() : "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
