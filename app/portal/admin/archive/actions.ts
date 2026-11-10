"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ArchivedTicket, TicketExportRow } from "@/types/database";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function escapeCsvCell(value: string): string {
  const str = String(value ?? "");
  if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
    return `\t"${str.replace(/"/g, '""')}"`;
  }
  if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function getArchivedTickets(filters?: {
  status?: string;
  priority?: string;
  service_id?: string;
  category_id?: string;
  assigned_to?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/portal");
  }

  let query = supabase
    .from("tickets")
    .select(`
      *,
      service:services(*),
      category:ticket_categories(*),
      requester:profiles!requester_id(id, full_name, email, role),
      assigned_to_profile:profiles!assigned_to(id, full_name, email)
    `)
    .order("closed_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }

  if (filters?.service_id && filters.service_id !== "all") {
    query = query.eq("service_id", filters.service_id);
  }

  if (filters?.category_id && filters.category_id !== "all") {
    query = query.eq("category_id", filters.category_id);
  }

  if (filters?.assigned_to && filters.assigned_to !== "all") {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data: tickets, error } = await query;

  if (error) {
    return { error: error.message, tickets: [] as ArchivedTicket[] };
  }

  return { tickets: tickets || [], error: null as string | null };
}

export async function exportTickets(format: "csv" | "json", filters?: {
  status?: string;
  priority?: string;
  service_id?: string;
  category_id?: string;
  assigned_to?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/portal");
  }

  let query = supabase
    .from("tickets")
    .select(`
      *,
      service:services(*),
      category:ticket_categories(*),
      requester:profiles!requester_id(id, full_name, email, role),
      assigned_to_profile:profiles!assigned_to(id, full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }

  if (filters?.service_id && filters.service_id !== "all") {
    query = query.eq("service_id", filters.service_id);
  }

  if (filters?.category_id && filters.category_id !== "all") {
    query = query.eq("category_id", filters.category_id);
  }

  if (filters?.assigned_to && filters.assigned_to !== "all") {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data: tickets, error } = await query;

  if (error) {
    return { error: error.message };
  }

  const ticketList = tickets || [];

  if (format === "json") {
    return {
      data: ticketList.map((t) => ({
        ticket_number: t.ticket_number,
        subject: t.subject,
        description: t.description,
        priority: t.priority,
        status: t.status,
        service: t.service?.name || null,
        category: t.category?.name || null,
        requester_name: t.requester?.full_name || null,
        requester_email: t.requester?.email || null,
        requester_role: t.requester?.role || null,
        assigned_to: t.assigned_to_profile?.full_name || null,
        assigned_to_email: t.assigned_to_profile?.email || null,
        created_at: t.created_at,
        updated_at: t.updated_at,
        closed_at: t.closed_at,
      })) satisfies TicketExportRow[],
      format: "json" as const,
      filename: `uphsd-it-helpdesk-tickets-${new Date().toISOString().split("T")[0]}.json`,
    };
  }

  const csvHeaders = [
    "Ticket Number",
    "Subject",
    "Description",
    "Priority",
    "Status",
    "Service",
    "Category",
    "Requester Name",
    "Requester Email",
    "Requester Role",
    "Assigned To",
    "Assigned To Email",
    "Created At",
    "Updated At",
    "Closed At",
  ];

  const csvRows = ticketList.map((t: ArchivedTicket) => [
    t.ticket_number,
    t.subject,
    t.description,
    t.priority,
    t.status,
    t.service?.name || "",
    t.category?.name || "",
    t.requester?.full_name || "",
    t.requester?.email || "",
    t.requester?.role || "",
    t.assigned_to_profile?.full_name || "",
    t.assigned_to_profile?.email || "",
    t.created_at ? new Date(t.created_at).toISOString() : "",
    t.updated_at ? new Date(t.updated_at).toISOString() : "",
    t.closed_at ? new Date(t.closed_at).toISOString() : "",
  ]);

  const csvContent = [
    csvHeaders,
    ...csvRows,
  ]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
    .join("\n");

  return {
    data: csvContent,
    format: "csv" as const,
    filename: `uphsd-it-helpdesk-tickets-${new Date().toISOString().split("T")[0]}.csv`,
  };
}

export async function getExportFilters() {
  const supabase = await getSupabase();

  const [servicesResult, categoriesResult, staffResult] = await Promise.all([
    supabase.from("services").select("id, name").eq("is_active", true).order("name"),
    supabase.from("ticket_categories").select("id, name").eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name, email").in("role", ["it_staff", "admin", "manager"]).order("full_name"),
  ]);

  return {
    services: servicesResult.data || [],
    categories: categoriesResult.data || [],
    staff: staffResult.data || [],
  };
}

export async function downloadCsvTemplate() {
  const headers = [
    "ticket_number",
    "requester_email",
    "service",
    "category",
    "subject",
    "description",
    "priority",
    "status",
    "created_at",
  ];

  const exampleRow = [
    "IT-2026-000001",
    "user@perpetual.edu.ph",
    "University Email",
    "Email",
    "Cannot access email",
    "User reports inability to log in to university email",
    "medium",
    "open",
    "2026-08-27",
  ];

  const csvContent = [
    headers.join(","),
    exampleRow.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
  ].join("\n");

  return {
    content: csvContent,
    filename: `uphsd-it-helpdesk-import-template-${new Date().toISOString().split("T")[0]}.csv`,
  };
}
