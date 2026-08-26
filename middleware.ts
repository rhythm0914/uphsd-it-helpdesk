import { createClient } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const response = await createClient(request);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const { createServerClient } = await import("@supabase/ssr");
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") ||
                      request.nextUrl.pathname.startsWith("/signup") ||
                      request.nextUrl.pathname.startsWith("/auth/sign-in") ||
                      request.nextUrl.pathname.startsWith("/auth/sign-up") ||
                      request.nextUrl.pathname.startsWith("/auth/forgot-password") ||
                      request.nextUrl.pathname.startsWith("/auth/update-password") ||
                      request.nextUrl.pathname === "/auth/sign-out" ||
                      request.nextUrl.pathname === "/auth/callback";

  const isPortalRoute = request.nextUrl.pathname.startsWith("/portal");

  if (isPortalRoute && !user) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
