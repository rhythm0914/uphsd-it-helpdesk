import { createClient } from "@/utils/supabase/server";
import { sortQueueTickets } from "@/utils/tickets/queue-order";
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

  // Reopened first, then urgent → low, then newest. See utils/tickets/queue-order.
  return { tickets: sortQueueTickets(tickets || []), error: null };
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

export async function getServices() {
  const supabase = await getSupabase();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return { services: services || [] };
}
