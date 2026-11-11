import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/utils/authorization";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=%2Fportal%2Fadmin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdmin(profile?.role || null)) {
    redirect("/portal?error=forbidden");
  }

  const [usersResult, ticketsResult, openResult, resolvedResult, servicesResult, categoriesResult] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("tickets").select("*", { count: "exact", head: true }),
      supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("services").select("*", { count: "exact", head: true }),
      supabase.from("ticket_categories").select("*", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Total Users", value: usersResult.count || 0, href: "/portal/admin/users" },
    { label: "Total Tickets", value: ticketsResult.count || 0, href: "/portal/queue" },
    { label: "Open Tickets", value: openResult.count || 0, href: "/portal/queue?status=open" },
    { label: "Resolved Tickets", value: resolvedResult.count || 0, href: "/portal/queue?status=resolved" },
    { label: "Services", value: servicesResult.count || 0, href: "/portal/admin/services" },
    { label: "Categories", value: categoriesResult.count || 0, href: "/portal/admin/services" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-foreground/60">System overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-border bg-background p-6 hover:border-primary transition-colors">
            <p className="text-sm text-foreground/60">{stat.label}</p>
            <p className="text-3xl font-semibold mt-2">{stat.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
