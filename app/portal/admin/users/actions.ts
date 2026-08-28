"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getUsers() {
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

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, users: [] };
  }

  return { users: users || [], error: null };
}

export async function createUser(formData: FormData) {
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

  const email = formData.get("email") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string;
  const department = formData.get("department") as string;
  const password = formData.get("password") as string;

  if (!email || !fullName || !role) {
    return { error: "Email, full name, and role are required" };
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: password || Math.random().toString(36).slice(-8),
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: authError?.message || "Failed to create user" };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: role as any,
      department: department || null,
    });

  if (profileError) {
    return { error: profileError.message };
  }

  return { success: true };
}

export async function updateUser(formData: FormData) {
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

  const userId = formData.get("user_id") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as string;
  const department = formData.get("department") as string;

  if (!userId) {
    return { error: "User ID is required" };
  }

  const allowedRoles = ["student", "employee", "it_staff", "admin", "manager"];
  if (!role || !allowedRoles.includes(role)) {
    return { error: "Invalid role value" };
  }

  // Role changes are routed exclusively through the SECURITY DEFINER helper
  // admin_set_user_role (which enforces the admin/manager gate and column-level
  // grants forbid a client from writing `role` directly). This keeps
  // role management working for authorized admins/managers while making
  // self-escalation impossible at the database layer.
  const { error: roleError } = await supabase.rpc("admin_set_user_role", {
    p_user_id: userId,
    p_role: role,
  });

  if (roleError) {
    return { error: roleError.message };
  }

  // Non-privileged profile fields are updated through the normal (RLS- and
  // column-grant-constrained) path.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      department: department || null,
    })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function toggleUserStatus(userId: string, currentStatus: boolean) {
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

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !currentStatus })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
