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
    closureTypeResult,
    firstResponseResult,
    slaComplianceResult,
    escalationsResult,
    reopensResult,
    ratingsResult,
  ] = await Promise.all([
    supabase.from("tickets").select("*", { count: "exact", head: true }),
    supabase.from("tickets").select("status", { count: "exact" }).order("status"),
    supabase.from("tickets").select("priority", { count: "exact" }).order("priority"),
    supabase.from("tickets").select("service_id", { count: "exact" }),
    supabase.from("tickets").select("created_at", { count: "exact" }).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    // Only verified fixes count toward resolution time. A "No Response" close is
    // not a service success and must not be reported as one.
    supabase
      .from("tickets")
      .select("created_at, closed_at, closure_reason")
      .eq("status", "closed")
      .eq("closure_reason", "verified_fixed"),
    supabase.from("ticket_closure_types").select("closure_type", { count: "exact" }),
    // First response time: tickets where a staff member replied.
    supabase
      .from("tickets")
      .select("created_at, first_response_at")
      .not("first_response_at", "is", null),
    // SLA compliance: on-track vs breached among closed tickets.
    supabase
      .from("tickets")
      .select("sla_status, closed_at")
      .in("status", ["closed", "resolved", "rejected"]),
    // Escalation count: tickets with escalation_level > 0.
    supabase.from("tickets").select("escalation_level").gt("escalation_level", 0),
    // Total reopens across all tickets.
    supabase.from("tickets").select("reopened_count"),
    // Satisfaction ratings from verified fixes.
    supabase.from("ticket_feedback").select("rating"),
  ]);

  const ticketsByStatus: Record<string, number> = {};
  ticketsByStatusResult.data?.forEach((ticket) => {
    ticketsByStatus[ticket.status] = (ticketsByStatus[ticket.status] || 0) + 1;
  });

  const ticketsByPriority: Record<string, number> = {};
  ticketsByPriorityResult.data?.forEach((ticket) => {
    ticketsByPriority[ticket.priority] = (ticketsByPriority[ticket.priority] || 0) + 1;
  });

  const ticketsByService: Record<string, number> = {};
  ticketsByServiceResult.data?.forEach((ticket) => {
    ticketsByService[ticket.service_id] = (ticketsByService[ticket.service_id] || 0) + 1;
  });

  const ticketsByClosureType: Record<string, number> = {};
  closureTypeResult.data?.forEach((row) => {
    const ct = row.closure_type;
    if (ct) {
      ticketsByClosureType[ct] = (ticketsByClosureType[ct] || 0) + 1;
    }
  });

  const monthlyData: Record<string, number> = {};
  ticketsByMonthResult.data?.forEach((ticket) => {
    const month = new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "Asia/Manila" });
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

  let avgResolutionTime = 0;
  const verifiedFixes = (resolutionTimeResult.data || []).filter(
    (ticket) => ticket.closed_at && ticket.closure_reason === "verified_fixed",
  );
  if (verifiedFixes.length > 0) {
    const totalTime = verifiedFixes.reduce((sum: number, ticket) => {
      const created = new Date(ticket.created_at).getTime();
      const closed = new Date(ticket.closed_at as string).getTime();
      return sum + (closed - created);
    }, 0);
    avgResolutionTime = Math.round(totalTime / verifiedFixes.length / (1000 * 60 * 60 * 24));
  }

  // Average first response time in hours.
  let avgFirstResponseHours = 0;
  const firstResponses = (firstResponseResult.data || []).filter(
    (ticket) => ticket.first_response_at,
  );
  if (firstResponses.length > 0) {
    const totalHours = firstResponses.reduce((sum: number, ticket) => {
      const created = new Date(ticket.created_at).getTime();
      const firstResp = new Date(ticket.first_response_at as string).getTime();
      return sum + (firstResp - created);
    }, 0);
    avgFirstResponseHours = Math.round((totalHours / firstResponses.length) / (1000 * 60 * 60) * 10) / 10;
  }

  // SLA compliance rate among closed/resolved/rejected tickets.
  let slaComplianceRate = 0;
  const slaTickets = slaComplianceResult.data || [];
  if (slaTickets.length > 0) {
    const onTrack = slaTickets.filter((t) => t.sla_status === "on_track").length;
    slaComplianceRate = Math.round((onTrack / slaTickets.length) * 100);
  }

  const totalEscalations = (escalationsResult.data || []).length;
  const totalReopens = (reopensResult.data || []).reduce(
    (sum: number, t) => sum + (t.reopened_count || 0),
    0,
  );

  let avgRating = 0;
  const ratings = (ratingsResult.data || []).filter((r) => r.rating);
  if (ratings.length > 0) {
    const sum = ratings.reduce((s: number, r) => s + (r.rating || 0), 0);
    avgRating = Math.round((sum / ratings.length) * 10) / 10;
  }

  return {
    totalTickets: totalTicketsResult.count || 0,
    ticketsByStatus,
    ticketsByPriority,
    ticketsByService,
    ticketsByClosureType,
    monthlyData,
    avgResolutionTime,
    avgFirstResponseHours,
    slaComplianceRate,
    totalEscalations,
    totalReopens,
    avgRating,
    error: null,
  };
}
