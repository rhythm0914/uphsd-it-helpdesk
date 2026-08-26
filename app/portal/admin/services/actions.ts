"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getServicesAndCategories() {
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

  const [servicesResult, categoriesResult] = await Promise.all([
    supabase.from("services").select("*").order("name"),
    supabase.from("ticket_categories").select("*").order("name"),
  ]);

  return {
    services: servicesResult.data || [],
    categories: categoriesResult.data || [],
    error: servicesResult.error?.message || categoriesResult.error?.message || null,
  };
}

export async function createService(formData: FormData) {
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

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) {
    return { error: "Service name is required" };
  }

  const { error } = await supabase
    .from("services")
    .insert({ name, description: description || null });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function createCategory(formData: FormData) {
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

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) {
    return { error: "Category name is required" };
  }

  const { error } = await supabase
    .from("ticket_categories")
    .insert({ name, description: description || null });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function toggleServiceStatus(serviceId: string, currentStatus: boolean) {
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
    .from("services")
    .update({ is_active: !currentStatus })
    .eq("id", serviceId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function toggleCategoryStatus(categoryId: string, currentStatus: boolean) {
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
    .from("ticket_categories")
    .update({ is_active: !currentStatus })
    .eq("id", categoryId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
