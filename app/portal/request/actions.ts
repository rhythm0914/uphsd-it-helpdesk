"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { generateTicketNumber } from "@/utils/ticket-number";
import { isUserRole, type Ticket } from "@/types/database";
import { isTicketPriority } from "@/utils/tickets/constants";

/** Minimum length of the "why is this urgent" explanation. */
const URGENT_REASON_MIN_LENGTH = 15;

const TICKET_NUMBER_RETRIES = 5;

export async function submitRequest(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=%2Fportal%2Frequest");
  }

  // A request needs a confirmed address: it is where the Request ID lives and
  // where every notification points. A session alone is not proof of ownership
  // of the mailbox (Phase 6).
  if (!user.email_confirmed_at) {
    redirect(
      "/portal/request?error=" +
        encodeURIComponent(
          "Please confirm your email address before submitting a request. Check your inbox for the confirmation link.",
        ),
    );
  }

  const serviceId = formData.get("service_id") as string;
  const categoryId = formData.get("category_id") as string;
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const priorityInput = (formData.get("priority") as string) || "medium";
  const priority = isTicketPriority(priorityInput) ? priorityInput : "medium";
  const urgentReason = ((formData.get("urgent_reason") as string) || "").trim();
  const urgentAcknowledged = formData.get("urgent_ack") === "on";

  if (!serviceId || !categoryId || !subject || !description) {
    redirect("/portal/request?error=All+required+fields+must+be+filled");
  }

  // The urgent path is gated server-side: a crafted request cannot claim
  // urgency without an acknowledgement and a specific explanation.
  if (priority === "urgent") {
    if (!urgentAcknowledged) {
      redirect(
        "/portal/request?error=" +
          encodeURIComponent("Please confirm that this issue is blocking you right now."),
      );
    }
    if (urgentReason.length < URGENT_REASON_MIN_LENGTH) {
      redirect(
        "/portal/request?error=" +
          encodeURIComponent(
            "Please explain why this request is urgent (at least " +
              URGENT_REASON_MIN_LENGTH +
              " characters).",
          ),
      );
    }
  }

  // tickets.requester_id is a foreign key to profiles(id). If the requester's
  // profile row is missing (e.g. created before the on_auth_user_created
  // trigger existed), the ticket insert below would fail. Ensure the profile
  // exists without overwriting an existing one.
  const metadata = (user.user_metadata as Record<string, unknown>) || {};
  const metadataRole = metadata.role;
  const safeRole = isUserRole(metadataRole) ? metadataRole : "student";
  await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: metadata.full_name || user.email || "",
        role: safeRole,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

  // Student vs employee, so the two populations can be reported separately.
  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const requesterPool = requesterProfile?.role === "employee" ? "employee" : "student";

  const { data: mapping } = await supabase
    .from("service_categories")
    .select("service_id")
    .eq("service_id", serviceId)
    .eq("category_id", categoryId)
    .single();

  if (!mapping) {
    redirect("/portal/request?error=Invalid+service+and+category+combination");
  }

  // Retry with an incremented number on a 23505 unique-violation (concurrent
  // submissions racing for the same ticket number).
  let data: Ticket | null = null;
  let error: { message?: string; code?: string } | null = null;
  for (let attempt = 0; attempt < TICKET_NUMBER_RETRIES; attempt++) {
    const ticketNumber = await generateTicketNumber(supabase, attempt);
    const result = await supabase
      .from("tickets")
      .insert({
        ticket_number: ticketNumber,
        requester_id: user.id,
        service_id: serviceId,
        category_id: categoryId,
        subject,
        description,
        priority,
        status: "open",
        priority_justification: priority === "urgent" ? urgentReason : null,
        requester_pool: requesterPool,
      })
      .select()
      .single();
    if (!result.error) {
      data = result.data;
      error = null;
      break;
    }
    if (result.error.code !== "23505") {
      error = result.error;
      break;
    }
    error = result.error;
  }

  if (error || !data) {
    redirect("/portal/request?error=" + encodeURIComponent(error?.message || "Failed to create ticket"));
  }

  redirect(`/portal/tickets/${data.id}`);
}

/**
 * Non-blocking duplicate check: returns true when the signed-in requester
 * already has an open ticket for the same service+category in the last 24h.
 * Used to warn (not prevent) submission. Always filtered by requester_id so a
 * caller can only probe their own tickets.
 */
export async function checkDuplicateTicket(
  serviceId: string,
  categoryId: string,
): Promise<{ duplicate: boolean; ticketNumber?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { duplicate: false };
  }

  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  let data;
  try {
    const result = await supabase
      .from("tickets")
      .select("ticket_number, status")
      .eq("requester_id", user.id)
      .eq("service_id", serviceId)
      .eq("category_id", categoryId)
      .in("status", ["open", "in_progress", "reopened", "waiting_for_user"])
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false })
      .limit(1);
    data = result.data;
  } catch {
    // Advisory-only: a transient DB error must not block submission.
    return { duplicate: false };
  }

  if (!data || data.length === 0) {
    return { duplicate: false };
  }

  return {
    duplicate: true,
    ticketNumber: data[0].ticket_number,
  };
}

