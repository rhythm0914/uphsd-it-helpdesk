import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (token_hash && type) {
    const cookieStore = await import("next/headers").then(m => m.cookies());
    const supabase = createClient(cookieStore);

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "recovery" | "magiclink" | "invite" | "email_change",
    });

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          await supabase.from("profiles").insert({
            id: user.id,
            email: user.email,
            full_name: (user.user_metadata as any)?.full_name || "",
            role: (user.user_metadata as any)?.role || "student",
          });
        }
      }

      if (type === "recovery") {
        return NextResponse.redirect(new URL("/auth/update-password", request.url));
      }
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return NextResponse.redirect(new URL("/auth/sign-in?error=invalid_or_expired_link", request.url));
}
