"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
    redirect("/auth/sign-in?error=" + encodeURIComponent(error.message));
  }

  redirect("/portal");
}

export async function signUp(formData: FormData) {
  const supabase = await getSupabase();
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: normalizedRole,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "https://uphsd-it-helpdesk.rycanano.workers.dev"}/auth/callback`,
    },
  });

  if (error) {
    redirect("/auth/sign-up?error=" + encodeURIComponent(error.message));
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: normalizedRole,
      });

    if (profileError) {
      redirect("/auth/sign-up?error=" + encodeURIComponent("Account created but profile setup failed. Please contact support."));
    }
  }

  redirect("/auth/sign-in?message=check_email");
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "https://uphsd-it-helpdesk.rycanano.workers.dev"}/auth/update-password`,
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
