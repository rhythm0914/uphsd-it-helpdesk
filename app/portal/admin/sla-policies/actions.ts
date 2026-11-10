"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/utils/audit/server";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getSlaPolicies() {
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

  const { data, error } = await supabase
    .from("sla_policies")
    .select("priority, response_minutes, resolution_minutes")
    .order("priority");

  if (error) {
    return { policies: [], error: error.message };
  }

  return {
    policies: (data || []).map((p) => ({
      priority: p.priority,
      responseMinutes: p.response_minutes,
      resolutionMinutes: p.resolution_minutes,
    })),
    error: null,
  };
}

export async function updateSlaPolicy(
  priority: string,
  responseMinutes: number,
  resolutionMinutes: number,
) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Admin or manager role required" };
  }

  const { error } = await supabase
    .from("sla_policies")
    .update({ response_minutes: responseMinutes, resolution_minutes: resolutionMinutes })
    .eq("priority", priority);

  if (error) {
    return { error: error.message };
  }

  await writeAuditLog({
    action: "update_sla_policy",
    targetType: "sla_policy",
    targetId: undefined,
    details: { priority, responseMinutes, resolutionMinutes },
  });

  return { success: true };
}
