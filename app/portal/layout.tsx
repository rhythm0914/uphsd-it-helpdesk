import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { RouteProgress } from "@/components/ui/route-progress";
import { UserMenu } from "@/components/UserMenu";
import { ChatWidget } from "@/components/ui/chat-widget";
import { isUserRole, type Profile } from "@/types/database";

export const dynamic = "force-dynamic";

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

  let profile: Pick<Profile, "role" | "full_name" | "email"> | null = null;
  let profileError: unknown = null;

  try {
    const result = await supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .single();
    profile = result.data;
    profileError = result.error;
  } catch (err) {
    profileError = err;
  }

  if (profileError || !profile) {
    // A missing or unreadable profile must NOT be treated as "unauthenticated".
    // The middleware has already verified a valid session for this user, so
    // redirecting to /auth/sign-in here creates a redirect loop (the middleware
    // bounces authenticated users on /auth/* back to /portal). Try to self-heal
    // the missing profile, and always fall back to a least-privilege default
    // derived from auth user metadata.
    const { data } = await supabase.auth.getUser();
    const userMetadata = (data.user?.user_metadata as Record<string, unknown>) || {};
    const fullName = (userMetadata.full_name as string) || "";
    const metadataRole = userMetadata.role;
    const role = isUserRole(metadataRole) ? metadataRole : "student";

    if (user.email) {
      try {
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: role,
        });
      } catch {
        // Ignore insert failures (e.g. RLS). The fallback default below keeps
        // the authenticated user inside the portal without privilege escalation.
      }
    }

    profile = { role, full_name: fullName, email: user.email ?? null };
  }

  const isITStaff = profile.role && ["it_staff", "admin", "manager"].includes(profile.role);
  const isAdmin = profile.role && ["admin", "manager"].includes(profile.role);

  // Unread in-app notifications (Phase 2). If the notifications table is not
  // there yet, the query returns null and the badge simply does not render.
  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <div className="flex flex-col flex-1">
      <RouteProgress />
      <nav className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 min-h-16 py-2 sm:py-0 sm:h-16 flex flex-wrap items-center justify-between gap-y-2">
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
          <div className="flex items-center gap-x-3 gap-y-2 sm:gap-4 text-sm font-medium flex-wrap">
            <Link
              href="/portal"
              className="text-foreground/70 hover:text-brand-primary transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/portal/request"
              className="text-foreground/70 hover:text-brand-primary transition-colors"
            >
              New Request
            </Link>
            <Link
              href="/portal/assistant"
              className="text-foreground/70 hover:text-brand-primary transition-colors"
            >
              IT Assistant
            </Link>
            {isITStaff && (
              <Link
                href="/portal/queue"
                className="text-foreground/70 hover:text-brand-primary transition-colors"
              >
                IT Queue
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/portal/admin"
                className="text-foreground/70 hover:text-brand-primary transition-colors"
              >
                Admin
              </Link>
            )}
            <Link
              href="/portal/notifications"
              className="text-foreground/70 hover:text-brand-primary transition-colors"
            >
              Notifications
              {unreadNotifications ? ` (${unreadNotifications})` : ""}
            </Link>
            <UserMenu
              name={profile.full_name}
              email={profile.email}
              role={profile.role}
            />
          </div>
        </div>
      </nav>
      <main className="flex-1 bg-surface">{children}</main>
      {/* Global floating AI Assistant (reuses existing /api/assistant). */}
      <ChatWidget authenticated />
    </div>
  );
}
