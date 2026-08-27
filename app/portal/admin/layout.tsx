import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { RouteProgress } from "@/components/ui/route-progress";

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
    <div className="flex flex-col flex-1">
      <RouteProgress />
      <nav className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/branding/uphsd-logo.png"
              alt="UPHSD Logo"
              width={120}
              height={40}
              className="h-8 w-auto"
              priority
            />
            <span className="hidden sm:inline text-sm font-medium text-foreground/70 border-l border-border pl-3">
              IT Help Desk
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/portal" className="text-foreground/70 hover:text-brand-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/portal/queue" className="text-foreground/70 hover:text-brand-primary transition-colors">
              IT Queue
            </Link>
            <Link href="/portal/admin" className="text-brand-primary font-medium">
              Admin
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-foreground/70 hover:text-brand-primary transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </nav>
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
    </div>
  );
}
