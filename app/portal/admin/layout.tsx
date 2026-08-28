import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StackIcon } from "@radix-ui/react-icons";

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
    <div className="flex flex-col md:flex-row flex-1">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-background md:self-stretch">
        <div className="p-4 flex md:flex-col gap-1 overflow-x-auto">
          <Link
            href="/portal/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors whitespace-nowrap shrink-0"
          >
            Overview
          </Link>
          <Link
            href="/portal/queue"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors whitespace-nowrap shrink-0"
          >
            <StackIcon className="h-4 w-4" />
            IT Queue
          </Link>
          <Link
            href="/portal/admin/users"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors whitespace-nowrap shrink-0"
          >
            Users
          </Link>
          <Link
            href="/portal/admin/services"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors whitespace-nowrap shrink-0"
          >
            Services & Categories
          </Link>
          <Link
            href="/portal/admin/knowledge-base"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors whitespace-nowrap shrink-0"
          >
            Knowledge Base
          </Link>
          <Link
            href="/portal/admin/reports"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors whitespace-nowrap shrink-0"
          >
            Reports
          </Link>
          <Link
            href="/portal/admin/archive"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors whitespace-nowrap shrink-0"
          >
            Archive & Export
          </Link>
          <Link
            href="/portal/admin/import"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-surface hover:text-brand-primary transition-colors whitespace-nowrap shrink-0"
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
