"use server";

async function getSupabase() {
  const { createClient } = await import("@/utils/supabase/server");
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getTicketWithAccess(ticketId: string) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", ticket: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["it_staff", "admin", "manager"].includes(profile.role)) {
    return { error: "Forbidden", ticket: null };
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(`
      *,
      service:services(*),
      category:ticket_categories(*),
      requester_profile:profiles!requester_id(id, full_name, email, department),
      assigned_to_profile:profiles!assigned_to(id, full_name, email)
    `)
    .eq("id", ticketId)
    .single();

  if (error || !ticket) {
    return { error: "Ticket not found", ticket: null };
  }

  return { ticket, error: null };
}

export async function getStatusHistory(ticketId: string) {
  const supabase = await getSupabase();
  
  const { data: history } = await supabase
    .from("ticket_status_history")
    .select(`
      *,
      changed_by_profile:profiles!changed_by(id, full_name, email)
    `)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  return { history: history || [] };
}

export async function getTicketMessages(ticketId: string) {
  const supabase = await getSupabase();
  
  const { data: messages } = await supabase
    .from("ticket_messages")
    .select(`
      *,
      sender:profiles!sender_id(id, full_name, email)
    `)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  return { messages: messages || [] };
}

export async function getStaffMembers() {
  const supabase = await getSupabase();
  
  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["it_staff", "admin", "manager"])
    .order("full_name");

  return { staff: staff || [] };
}
