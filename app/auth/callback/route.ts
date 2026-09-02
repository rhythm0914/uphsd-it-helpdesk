import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getValidatedReturnTo } from "@/utils/authorization";
import type { UserMetadata } from "@/types/database";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  console.log("[callback] invoked", { hasCode: !!code, hasTokenHash: !!token_hash, type });

  // Destination after a successful exchange. `forgotPassword` passes
  // `?next=/auth/update-password` for the reset flow; the value is validated to
  // a safe same-origin path. Everything else (e.g. signup confirmation) falls
  // back to the portal.
  const next = getValidatedReturnTo(requestUrl.searchParams.get("next"));

  const cookieStore = await import("next/headers").then(m => m.cookies());
  const supabase = createClient(cookieStore);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[callback] exchangeCodeForSession result", { error: error ? { message: error.message, code: error.code } : null });

    if (!error) {
      // Recovery (PKCE) carries `next=/auth/update-password`; signup/other
      // flows default to `/portal`.
      return NextResponse.redirect(new URL(next, request.url));
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

      const destination =
        type === "recovery" ? "/auth/update-password" : next;
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return NextResponse.redirect(new URL("/auth/sign-in?error=invalid_or_expired_link", request.url));
}
