import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

      return (
    <div className="flex flex-1">
      <aside className="w-64 border-r border-border bg-background">
        <div className="p-4 space-y-1">
          <Link
            href="/portal/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/portal/admin/users"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors"
          >
            Users
          </Link>
          <Link
            href="/portal/admin/services"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors"
          >
            Services & Categories
          </Link>
          <Link
            href="/portal/admin/reports"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors"
          >
            Reports
          </Link>
          <Link
            href="/portal/admin/archive"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors"
          >
            Archive & Export
          </Link>
          <Link
            href="/portal/admin/import"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors"
          >
            Import
          </Link>
        </div>
      </aside>
      <main className="flex-1 bg-surface">
        {children}
      </main>
    </div>
  );
}
