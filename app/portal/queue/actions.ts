"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getITQueue(filters?: {
  status?: string;
  priority?: string;
  service_id?: string;
  search?: string;
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

  if (!profile || !["it_staff", "admin", "manager"].includes(profile.role)) {
    redirect("/portal");
  }

  let query = supabase
    .from("tickets")
    .select(`
      *,
      service:services(*),
      category:ticket_categories(*),
      requester:profiles!requester_id(id, full_name, email, department),
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

  if (filters?.search) {
    query = query.or(`ticket_number.ilike.%${filters.search}%,subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data: tickets, error } = await query;

  if (error) {
    return { error: error.message, tickets: [] };
  }

  return { tickets: tickets || [], error: null };
}

export async function assignTicket(ticketId: string, staffId: string) {
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

  if (!profile || !["it_staff", "admin", "manager"].includes(profile.role)) {
    redirect("/portal");
  }

  const { error } = await supabase
    .from("tickets")
    .update({
      assigned_to: staffId,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("ticket_status_history").insert({
    ticket_id: ticketId,
    old_status: "open",
    new_status: "in_progress",
    changed_by: user.id,
    notes: "Assigned to staff member",
  });

  return { success: true };
}

export async function updateTicketStatus(ticketId: string, status: string, notes?: string) {
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

  if (!profile || !["it_staff", "admin", "manager"].includes(profile.role)) {
    redirect("/portal");
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("status")
    .eq("id", ticketId)
    .single();

  if (!ticket) {
    return { error: "Ticket not found" };
  }

  const { error } = await supabase
    .from("tickets")
    .update({
      status: status as any,
      updated_at: new Date().toISOString(),
      ...(status === "closed" || status === "resolved" ? { closed_at: new Date().toISOString() } : {}),
    })
    .eq("id", ticketId);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("ticket_status_history").insert({
    ticket_id: ticketId,
    old_status: ticket.status,
    new_status: status as any,
    changed_by: user.id,
    notes: notes || `Status changed to ${status}`,
  });

  return { success: true };
}

export async function addWorkRemark(ticketId: string, message: string, isInternal: boolean = false) {
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

  if (!profile || !["it_staff", "admin", "manager"].includes(profile.role)) {
    redirect("/portal");
  }

  const { error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_id: user.id,
      message,
      is_internal: isInternal,
    });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getITStaff() {
  const supabase = await getSupabase();

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["it_staff", "admin", "manager"])
    .eq("is_active", true)
    .order("full_name");

  return { staff: staff || [] };
}
