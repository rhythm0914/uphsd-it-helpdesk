"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function revalidate() {
  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
}

function fail(message: string): never {
  redirect("/portal/notifications?error=" + encodeURIComponent(message));
}

/**
 * Mark one notification as read.
 *
 * Returns void because it is used directly as a form action. RLS restricts the
 * update to the caller's own rows; the explicit user_id filter keeps the intent
 * obvious and makes the result independent of policy changes.
 */
export async function markNotificationRead(formData: FormData): Promise<void> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=" + encodeURIComponent("/portal/notifications"));
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) fail("Missing notification id");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) fail(error.message);

  revalidate();
}

/** Mark every unread notification for the signed-in user as read. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=" + encodeURIComponent("/portal/notifications"));
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) fail(error.message);

  revalidate();
}
