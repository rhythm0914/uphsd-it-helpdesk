import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
    .eq("service_id", serviceId)
    .order("category:name");

  const categories = (mappings || []).map((m: any) => m.category);

  return NextResponse.json({ categories });
}
