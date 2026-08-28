"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getReports() {
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

  const [
    totalTicketsResult,
    ticketsByStatusResult,
    ticketsByPriorityResult,
    ticketsByServiceResult,
    ticketsByMonthResult,
    resolutionTimeResult,
  ] = await Promise.all([
    supabase.from("tickets").select("*", { count: "exact", head: true }),
    supabase.from("tickets").select("status", { count: "exact" }).order("status"),
    supabase.from("tickets").select("priority", { count: "exact" }).order("priority"),
    supabase.from("tickets").select("service_id", { count: "exact" }),
    supabase.from("tickets").select("created_at", { count: "exact" }).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("tickets").select("created_at, closed_at").eq("status", "closed"),
  ]);

  const ticketsByStatus: Record<string, number> = {};
  ticketsByStatusResult.data?.forEach((ticket: any) => {
    ticketsByStatus[ticket.status] = (ticketsByStatus[ticket.status] || 0) + 1;
  });

  const ticketsByPriority: Record<string, number> = {};
  ticketsByPriorityResult.data?.forEach((ticket: any) => {
    ticketsByPriority[ticket.priority] = (ticketsByPriority[ticket.priority] || 0) + 1;
  });

  const ticketsByService: Record<string, number> = {};
  ticketsByServiceResult.data?.forEach((ticket: any) => {
    ticketsByService[ticket.service_id] = (ticketsByService[ticket.service_id] || 0) + 1;
  });

  const monthlyData: Record<string, number> = {};
  ticketsByMonthResult.data?.forEach((ticket: any) => {
    const month = new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "Asia/Manila" });
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

  let avgResolutionTime = 0;
  if (resolutionTimeResult.data && resolutionTimeResult.data.length > 0) {
    const totalTime = resolutionTimeResult.data.reduce((sum: number, ticket: any) => {
      if (ticket.closed_at) {
        const created = new Date(ticket.created_at).getTime();
        const closed = new Date(ticket.closed_at).getTime();
        return sum + (closed - created);
      }
      return sum;
    }, 0);
    avgResolutionTime = Math.round(totalTime / resolutionTimeResult.data.length / (1000 * 60 * 60 * 24));
  }

  return {
    totalTickets: totalTicketsResult.count || 0,
    ticketsByStatus,
    ticketsByPriority,
    ticketsByService,
    monthlyData,
    avgResolutionTime,
    error: null,
  };
}
