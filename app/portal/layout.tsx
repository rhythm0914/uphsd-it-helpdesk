import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export default async function PortalLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isITStaff = profile?.role && ["it_staff", "admin", "manager"].includes(profile.role);
  const isAdmin = profile?.role && ["admin", "manager"].includes(profile.role);

  return (
    <div className="flex flex-col flex-1">
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
            <Link href="/portal/request" className="text-foreground/70 hover:text-brand-primary transition-colors">
              New Request
            </Link>
            {isITStaff && (
              <Link href="/portal/queue" className="text-foreground/70 hover:text-brand-primary transition-colors">
                IT Queue
              </Link>
            )}
            {isAdmin && (
              <Link href="/portal/admin" className="text-foreground/70 hover:text-brand-primary transition-colors">
                Admin
              </Link>
            )}
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
      <main className="flex-1 bg-surface">
        {children}
      </main>
    </div>
  );
}