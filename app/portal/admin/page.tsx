import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/portal");
  }

  const role = profile.role;
  if (role !== "admin" && role !== "manager") {
    redirect("/portal");
  }

  const [
    usersResult,
    ticketsResult,
    openResult,
    resolvedResult,
    servicesResult,
    categoriesResult,
  ] = await Promise.all([
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
        <p className="mt-1 text-foreground/60">
          System overview and management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-border bg-background p-6 hover:border-brand-primary transition-colors"
          >
            <p className="text-sm text-foreground/60">{stat.label}</p>
            <p className="text-3xl font-semibold mt-2">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/portal/queue"
              className="flex items-center justify-between rounded-lg border border-brand-primary bg-brand-primary/5 p-4 hover:border-brand-primary-hover transition-colors"
            >
              <span className="font-medium">IT Queue — Manage Tickets</span>
              <span className="text-foreground/60">→</span>
            </Link>
            <Link
              href="/portal/admin/users"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-brand-primary transition-colors"
            >
              <span className="font-medium">Manage Users</span>
              <span className="text-foreground/60">→</span>
            </Link>
            <Link
              href="/portal/admin/services"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-brand-primary transition-colors"
            >
              <span className="font-medium">Manage Services</span>
              <span className="text-foreground/60">→</span>
            </Link>
            <Link
              href="/portal/admin/reports"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-brand-primary transition-colors"
            >
              <span className="font-medium">View Reports</span>
              <span className="text-foreground/60">→</span>
            </Link>
            <Link
              href="/portal/admin/archive"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-brand-primary transition-colors"
            >
              <span className="font-medium">Archive & Export</span>
              <span className="text-foreground/60">→</span>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-lg font-semibold mb-4">System Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground/60">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Environment</span>
              <span className="font-medium">Production</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Database</span>
              <span className="font-medium">Supabase PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Hosting</span>
              <span className="font-medium">Cloudflare Workers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
