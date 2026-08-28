import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { TicketCategory } from "@/types/database";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const serviceId = requestUrl.searchParams.get("service_id");

  if (!serviceId) {
    return NextResponse.json({ error: "service_id is required" }, { status: 400 });
  }

  const cookieStore = await import("next/headers").then((m) => m.cookies());
  const supabase = createClient(cookieStore);

  const { data: mappings } = await supabase
    .from("service_categories")
    .select(`
      category_id,
      category:ticket_categories!inner(*)
    `)
    .eq("service_id", serviceId);

  // ticket_categories!inner(*) yields one related category row per mapping.
  const categories = (mappings ?? [])
    .map((m) => (m as { category: unknown }).category as TicketCategory)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ categories });
}
