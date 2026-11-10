"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getAuditLog({
  page = 1,
  pageSize = 50,
  action,
  actorId,
  startDate,
  endDate,
}: {
  page?: number;
  pageSize?: number;
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
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
    .from("audit_log")
    .select(
      "id, created_at, actor_id, actor_role, action, target_type, target_id, details, ip_address",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (action) {
    query = query.ilike("action", `%${action}%`);
  }
  if (actorId) {
    query = query.eq("actor_id", actorId);
  }
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data, error, count } = await query;

  if (error) {
    return { auditLog: [], total: 0, error: error.message };
  }

  // Fetch actor names for display.
  const actorIds = [...new Set((data || []).map((r) => r.actor_id).filter(Boolean))];
  let actorNames: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);
    actorNames = Object.fromEntries(
      (actors || []).map((a) => [a.id, a.full_name || a.email || "Unknown"]),
    );
  }

  return {
    auditLog: (data || []).map((row) => ({
      ...row,
      actor_name: actorNames[row.actor_id] || "Unknown",
    })),
    total: count || 0,
    error: null,
  };
}
