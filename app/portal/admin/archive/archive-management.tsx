"use client";

import { useState } from "react";
import { getArchivedTickets, exportTickets, getExportFilters } from "./actions";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/utils/format-date";
import type { ArchivedTicket } from "@/types/database";

interface FilterOption {
  id: string;
  name: string;
}

interface StaffOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function ArchiveManagement() {
  const [tickets, setTickets] = useState<ArchivedTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    service_id: "all",
    category_id: "all",
    assigned_to: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [filterOptions, setFilterOptions] = useState<{
    services: FilterOption[];
    categories: FilterOption[];
    staff: StaffOption[];
  }>({ services: [], categories: [], staff: [] });

  useState(() => {
    getExportFilters().then((options) => setFilterOptions(options));
  });

  async function handleSearch(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await getArchivedTickets({
      status: formData.get("status") as string,
      priority: formData.get("priority") as string,
      service_id: formData.get("service_id") as string,
      category_id: formData.get("category_id") as string,
      assigned_to: formData.get("assigned_to") as string,
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
    const result = await exportTickets(format, {
      status: filters.status,
      priority: filters.priority,
      service_id: filters.service_id,
      category_id: filters.category_id,
      assigned_to: filters.assigned_to,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      setLoading(false);
      return;
    }

    const blob = new Blob([String(result.data)], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename || `tickets-export-${new Date().toISOString().split("T")[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);

    setMessage({ type: "success", text: `Exported ${Array.isArray(result.data) ? result.data.length : "records"} as ${format.toUpperCase()}` });
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
        <h3 className="text-lg font-semibold mb-4">Filter Tickets</h3>
        <form action={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_for_user">Waiting for User</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium mb-2">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label htmlFor="service_id" className="block text-sm font-medium mb-2">
                Service
              </label>
              <select
                id="service_id"
                name="service_id"
                value={filters.service_id}
                onChange={(e) => setFilters({ ...filters, service_id: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="all">All Services</option>
                {filterOptions.services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category_id" className="block text-sm font-medium mb-2">
                Category
              </label>
              <select
                id="category_id"
                name="category_id"
                value={filters.category_id}
                onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="all">All Categories</option>
                {filterOptions.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assigned_to" className="block text-sm font-medium mb-2">
                Assigned To
              </label>
              <select
                id="assigned_to"
                name="assigned_to"
                value={filters.assigned_to}
                onChange={(e) => setFilters({ ...filters, assigned_to: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="all">All Staff</option>
                {filterOptions.staff.map((member) => (
                  <option key={member.id} value={member.id}>{member.full_name}</option>
                ))}
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    <span>Loading…</span>
                  </>
                ) : (
                  "Filter"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
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
          Export filtered ticket data for reporting and backup purposes. Exports respect the current filter selection.
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
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Priority</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Requester</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Service</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground/60">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket: ArchivedTicket) => (
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
                      <span className="text-sm capitalize">{ticket.priority}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{ticket.requester?.full_name || "Unknown"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{ticket.service?.name || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground/60">
                        {ticket.updated_at ? formatDate(ticket.updated_at) : "—"}
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
