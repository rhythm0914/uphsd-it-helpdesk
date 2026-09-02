"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getValidatedReturnTo } from "@/utils/authorization";

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
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  console.log("[signUp] action invoked", { emailDomain: email ? email.split("@")[1] : "missing" });

  if (!fullName || !email || !password || !confirmPassword) {
    redirect("/auth/sign-up?error=All+required+fields+must+be+filled");
  }

  if (password !== confirmPassword) {
    redirect("/auth/sign-up?error=Passwords+do+not+match");
  }

  if (password.length < 8) {
    redirect("/auth/sign-up?error=Password+must+be+at+least+8+characters");
  }

  if (!email.endsWith("@perpetual.edu.ph")) {
    redirect("/auth/sign-up?error=Please+use+your+UPHSD+institutional+email+address");
  }

  const allowedRoles = ["student", "employee"];
  const normalizedRole = allowedRoles.includes(role) ? role : "student";

  const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL || "https://uphsd-it-helpdesk.rycanano.workers.dev"}/auth/callback`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: normalizedRole,
      },
      emailRedirectTo: redirectTo,
    },
  });

  console.log("[signUp] result", { error: error ? { message: error.message, code: error.code } : null });

  if (error) {
    redirect("/auth/sign-up?error=" + encodeURIComponent(error.message));
  }

  redirect("/auth/sign-in?message=check_email");
}

export async function resendConfirmation(formData: FormData) {
  const supabase = await getSupabase();
  const email = formData.get("email") as string;

  console.log("[resendConfirmation] action invoked", { emailDomain: email ? email.split("@")[1] : "missing" });

  if (!email) {
    redirect("/auth/sign-in?error=Email+is+required");
  }

  if (!email.endsWith("@perpetual.edu.ph")) {
    redirect("/auth/sign-in?error=Please+use+your+UPHSD+institutional+email+address");
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email,
  });

  console.log("[resendConfirmation] result", { error: error ? { message: error.message, code: error.code } : null });

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
