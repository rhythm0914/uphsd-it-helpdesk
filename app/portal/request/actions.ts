"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { generateTicketNumber } from "@/utils/ticket-number";

const TICKET_NUMBER_RETRIES = 5;

export async function submitRequest(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const serviceId = formData.get("service_id") as string;
  const categoryId = formData.get("category_id") as string;
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as string;

  if (!serviceId || !categoryId || !subject || !description) {
    redirect("/portal/request?error=All+required+fields+must+be+filled");
  }

  // tickets.requester_id is a foreign key to profiles(id). If the requester's
  // profile row is missing (e.g. created before the on_auth_user_created
  // trigger existed), the ticket insert below would fail. Ensure the profile
  // exists without overwriting an existing one.
  const metadata = (user.user_metadata as any) || {};
  const metadataRole = metadata.role || "student";
  const safeRole = ["student", "employee", "it_staff", "admin", "manager"].includes(metadataRole)
    ? metadataRole
    : "student";
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
  let data: any = null;
  let error: any = null;
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
        priority: priority || "normal",
        status: "open",
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
