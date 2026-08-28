import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { UserMetadata } from "@/types/database";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  console.log("[callback] invoked", { hasCode: !!code, hasTokenHash: !!token_hash, type });

  const cookieStore = await import("next/headers").then(m => m.cookies());
  const supabase = createClient(cookieStore);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[callback] exchangeCodeForSession result", { error: error ? { message: error.message, code: error.code } : null });

    if (!error) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "recovery" | "magiclink" | "invite" | "email_change",
    });

    console.log("[callback] verifyOtp result", { error: error ? { message: error.message, code: error.code } : null });

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
            full_name: (user.user_metadata as UserMetadata)?.full_name || "",
            role: (user.user_metadata as UserMetadata)?.role || "student",
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
