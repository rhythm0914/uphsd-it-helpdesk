"use server";

// Server actions for knowledge-base management. Every action re-verifies
// auth + admin/manager role server-side (UI checks are never trusted) and
// relies on the knowledge_articles RLS policies as a second layer.

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

/** Returns the supabase client for an authorized admin/manager, else null. */
async function requireAdminManager() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) return null;
  return { supabase, userId: user.id };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface KnowledgeArticleListItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  keywords: string[] | null;
  is_published: boolean;
  service_id: string | null;
  category_id: string | null;
  service: { name: string } | null;
  category: { name: string } | null;
  updated_at: string;
}
export async function getArticles(query?: string) {
  const auth = await requireAdminManager();
  if (!auth) redirect("/portal");

  let builder = auth.supabase
    .from("knowledge_articles")
    .select(
      "id, title, slug, content, keywords, is_published, service_id, category_id, service:services(name), category:ticket_categories(name), updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (query && query.trim()) {
    const q = query.trim();
    builder = builder.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
  }

  const { data, error } = await builder;
  return {
    articles: (data ?? []) as unknown as KnowledgeArticleListItem[],
    error: error ? error.message : null,
  };
}

export async function getServicesAndCategories() {
  const auth = await requireAdminManager();
  if (!auth) redirect("/portal");

  const [services, categories] = await Promise.all([
    auth.supabase.from("services").select("id, name").eq("is_active", true).order("name"),
    auth.supabase.from("ticket_categories").select("id, name").eq("is_active", true).order("name"),
  ]);

  return {
    services: services.data ?? [],
    categories: categories.data ?? [],
  };
}

export interface ArticleActionResult {
  error: string | null;
  success: boolean;
}

export async function createArticle(formData: FormData): Promise<ArticleActionResult> {
  const auth = await requireAdminManager();
  if (!auth) return { error: "Not authorized", success: false };

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 20);
  const serviceId = String(formData.get("service_id") ?? "") || null;
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const isPublished = formData.get("is_published") === "true";

  if (!title || !content) {
    return { error: "Title and content are required", success: false };
  }
  if (title.length > 200) {
    return { error: "Title is too long", success: false };
  }

  const { error } = await auth.supabase.from("knowledge_articles").insert({
    title,
    slug: `${slugify(title)}-${Date.now().toString(36)}`,
    content,
    keywords,
    service_id: serviceId,
    category_id: categoryId,
    is_published: isPublished,
    created_by: auth.userId,
  });

  if (error) return { error: error.message, success: false };

  revalidatePath("/portal/admin/knowledge-base");
  revalidatePath("/portal/assistant");
  return { error: null, success: true };
}

export async function updateArticle(formData: FormData): Promise<ArticleActionResult> {
  const auth = await requireAdminManager();
  if (!auth) return { error: "Not authorized", success: false };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 20);
  const serviceId = String(formData.get("service_id") ?? "") || null;
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const isPublished = formData.get("is_published") === "true";

  if (!id || !title || !content) {
    return { error: "Id, title and content are required", success: false };
  }

  const { error } = await auth.supabase
    .from("knowledge_articles")
    .update({
      title,
      content,
      keywords,
      service_id: serviceId,
      category_id: categoryId,
      is_published: isPublished,
    })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/portal/admin/knowledge-base");
  revalidatePath("/portal/assistant");
  return { error: null, success: true };
}

export async function setArticlePublished(
  id: string,
  published: boolean,
): Promise<ArticleActionResult> {
  const auth = await requireAdminManager();
  if (!auth) return { error: "Not authorized", success: false };

  const { error } = await auth.supabase
    .from("knowledge_articles")
    .update({ is_published: published })
    .eq("id", id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/portal/admin/knowledge-base");
  revalidatePath("/portal/assistant");
  return { error: null, success: true };
}

export async function deleteArticle(id: string): Promise<ArticleActionResult> {
  const auth = await requireAdminManager();
  if (!auth) return { error: "Not authorized", success: false };

  const { error } = await auth.supabase.from("knowledge_articles").delete().eq("id", id);
  if (error) return { error: error.message, success: false };

  revalidatePath("/portal/admin/knowledge-base");
  return { error: null, success: true };
}
