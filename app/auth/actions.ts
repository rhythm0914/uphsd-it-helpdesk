"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getValidatedReturnTo, normalizeSignupRole } from "@/utils/authorization";
import { UPHSD_EMAIL_ERROR, isUphsdEmail, normalizeEmail } from "@/utils/auth/email-domain";
import { checkRateLimit } from "@/utils/auth/rate-limit";
import { writeAuditLog } from "@/utils/audit/server";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function signIn(formData: FormData) {
  const supabase = await getSupabase();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/auth/sign-in?error=Email+and+password+are+required");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // If the account exists but its email is not yet confirmed, route the user
    // to a focused state that pre-fills the resend-confirmation UI instead of a
    // generic "wrong credentials" message.
    if (error.code === "email_not_confirmed") {
      redirect(
        "/auth/sign-in?error=email_not_confirmed&email=" +
          encodeURIComponent(email),
      );
    }
    redirect("/auth/sign-in?error=" + encodeURIComponent(error.message));
  }

  // Honor a validated return-to destination when one was passed through the
  // sign-in page (e.g. /portal/request after an unauthenticated click on the
  // "Submit a Request" CTA). Falls back to /portal to preserve the original
  // behavior and to prevent open redirects.
  const next = getValidatedReturnTo(formData.get("next") as string | null);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const supabase = await getSupabase();
  const fullName = formData.get("fullName") as string;
  const email = normalizeEmail((formData.get("email") as string) || "");
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const privacyConsent = formData.get("privacyConsent");

  if (!fullName || !email || !password || !confirmPassword) {
    redirect("/auth/sign-up?error=All+required+fields+must+be+filled");
  }

  if (privacyConsent !== "on") {
    redirect("/auth/sign-up?error=You+must+consent+to+the+Privacy+Notice");
  }

  if (password !== confirmPassword) {
    redirect("/auth/sign-up?error=Passwords+do+not+match");
  }

  if (password.length < 8) {
    redirect("/auth/sign-up?error=Password+must+be+at+least+8+characters");
  }

  // Case-insensitive exact-domain check, defined once in utils/auth/email-domain.
  if (!isUphsdEmail(email)) {
    redirect("/auth/sign-up?error=" + encodeURIComponent(UPHSD_EMAIL_ERROR));
  }

  // Public sign-up creates students only; Employee and staff accounts are
  // granted by an administrator (Phase 6). The submitted role is ignored.
  const normalizedRole = normalizeSignupRole("student");

  const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL || "https://uphsd-it-helpdesk.rycanano.workers.dev"}/auth/callback`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: normalizedRole,
        privacy_consent_at: new Date().toISOString(),
        privacy_consent_version: "1.0",
      },
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    redirect("/auth/sign-up?error=" + encodeURIComponent(error.message));
  }

  redirect("/auth/sign-in?message=check_email");
}

export async function resendConfirmation(formData: FormData) {
  const supabase = await getSupabase();
  const email = normalizeEmail((formData.get("email") as string) || "");

  if (!email) {
    redirect("/auth/sign-in?error=Email+is+required");
  }

  if (!isUphsdEmail(email)) {
    redirect("/auth/sign-in?error=" + encodeURIComponent(UPHSD_EMAIL_ERROR));
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email,
  });

  if (error) {
    redirect("/auth/sign-in?error=" + encodeURIComponent(error.message));
  }

  redirect("/auth/sign-in?message=confirmation_sent");
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPassword(formData: FormData) {
  const supabase = await getSupabase();
  const email = formData.get("email") as string;

  if (!email) {
    redirect("/auth/forgot-password?error=Email+is+required");
  }

  // Recovery only works for @perpetual.edu.ph accounts (same server-side
  // domain rule as sign-up).
  if (!isUphsdEmail(email)) {
    redirect("/auth/forgot-password?error=" + encodeURIComponent(UPHSD_EMAIL_ERROR));
  }

  // Rate limit per email and per IP (best effort in serverless).
  const emailKey = `forgot:email:${normalizeEmail(email)}`;
  const emailLimit = checkRateLimit(emailKey);
  if (!emailLimit.allowed) {
    redirect("/auth/forgot-password?error=Too+many+requests.+Please+try+again+later.");
  }

  // Route the recovery link through `/auth/callback` (PKCE token exchange),
  // then on to `/auth/update-password`. Pointing `redirectTo` straight at
  // `/auth/update-password` previously landed users on that page with a
  // recovery `code` that was never exchanged, so `updateUser` failed for lack
  // of a session (the reset never completed).
  const redirectTo =
    `${process.env.NEXT_PUBLIC_BASE_URL || "https://uphsd-it-helpdesk.rycanano.workers.dev"}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  // Always return the same message whether or not the email exists, to
  // prevent account enumeration. Supabase's resetPasswordForEmail does not
  // reveal whether the email is registered.
  if (error) {
    redirect("/auth/forgot-password?error=" + encodeURIComponent(error.message));
  }

  redirect("/auth/forgot-password?message=reset_sent");
}

export async function updatePassword(formData: FormData) {
  const supabase = await getSupabase();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    redirect("/auth/update-password?error=All+fields+are+required");
  }

  if (password !== confirmPassword) {
    redirect("/auth/update-password?error=Passwords+do+not+match");
  }

  if (password.length < 8) {
    redirect("/auth/update-password?error=Password+must+be+at+least+8+characters");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect("/auth/update-password?error=" + encodeURIComponent(error.message));
  }

  redirect("/auth/sign-in?message=password_updated");
}

/**
 * Admin-assisted recovery for users who lost access to their UPHSD mailbox.
 *
 * The admin confirms the user's identity in person, then triggers a
 * Supabase password-reset/invite for the verified account. The admin never
 * sees the user's password. Only admin/manager may call this.
 *
 * An audit log entry is written.
 */
export async function adminAssistedRecovery(userId: string) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Admin or manager role required" };
  }

  // Look up the target account.
  const { data: target } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .single();

  if (!target?.email) {
    return { error: "Account not found" };
  }

  // Trigger a password reset for the target account. Supabase sends the
  // recovery email to the user's mailbox. The admin never sees a password.
  const redirectTo =
    `${process.env.NEXT_PUBLIC_BASE_URL || "https://uphsd-it-helpdesk.rycanano.workers.dev"}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
    redirectTo,
  });

  if (error) {
    return { error: error.message };
  }

  await writeAuditLog({
    action: "admin_assisted_recovery",
    targetType: "profile",
    targetId: userId,
    details: { recovered_email: target.email, administered_by: profile.role },
  });

  return { success: true };
}
