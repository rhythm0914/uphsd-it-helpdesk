import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { RouteProgress } from "@/components/ui/route-progress";
import { ChatWidget } from "@/components/ui/chat-widget";
import { isUserRole, type Profile } from "@/types/database";
import Footer from "@/components/layout/footer";
import { PortalShell } from "@/components/layout/portal-shell";
import { getValidatedReturnTo } from "@/utils/authorization";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const h = await headers();
    const path = h.get("x-invoke-path") || h.get("x-pathname") || "/portal";
    const next = getValidatedReturnTo(path, "/portal");
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
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
    const userMetadata = (user.user_metadata as Record<string, unknown>) || {};
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
        // Ignore insert failures (e.g. RLS).
      }
    }

    profile = { role, full_name: fullName, email: user.email ?? null };
  }

  const unreadNotifications = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <div className="flex flex-col flex-1 h-full">
      <RouteProgress />
      <PortalShell
        userName={profile.full_name}
        userEmail={profile.email}
        userRole={profile.role}
        unreadNotifications={unreadNotifications.count ?? 0}
      >
        {children}
      </PortalShell>
      <Footer />
      <ChatWidget authenticated />
    </div>
  );
}
