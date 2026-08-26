"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getArchivedTickets(filters?: {
  status?: string;
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
      requester:profiles!requester_id(id, full_name, email)
    `)
    .in("status", ["resolved", "closed"])
    .order("closed_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.dateFrom) {
    query = query.gte("closed_at", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("closed_at", filters.dateTo);
  }

  const { data: tickets, error } = await query;

  if (error) {
    return { error: error.message, tickets: [] as any[] };
  }

  return { tickets: tickets || [], error: null as string | null };
}

export async function exportTickets(format: "csv" | "json") {
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

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(`
      *,
      service:services(*),
      category:ticket_categories(*),
      requester:profiles!requester_id(id, full_name, email)
    `)
    .in("status", ["resolved", "closed"])
    .order("closed_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  if (format === "json") {
    return { data: (tickets || []) as any[], format: "json" as const };
  }

  const csvHeaders = ["Ticket Number", "Subject", "Status", "Priority", "Service", "Category", "Requester", "Created", "Closed"];
  const csvRows = (tickets || []).map((ticket: any) => [
    ticket.ticket_number,
    ticket.subject,
    ticket.status,
    ticket.priority,
    ticket.service?.name || "",
    ticket.category?.name || "",
    ticket.requester?.full_name || "",
    new Date(ticket.created_at).toLocaleDateString(),
    ticket.closed_at ? new Date(ticket.closed_at).toLocaleDateString() : "",
  ]);

  const csvContent = [csvHeaders, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return { data: csvContent as string, format: "csv" as const };
}
