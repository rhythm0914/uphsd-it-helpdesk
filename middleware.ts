import { createClient } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { response, user } = await createClient(request);

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth/sign-in") ||
    pathname.startsWith("/auth/sign-up") ||
    pathname.startsWith("/auth/forgot-password") ||
    pathname.startsWith("/auth/update-password") ||
    pathname === "/auth/sign-out" ||
    pathname === "/auth/callback";

  const isPortalRoute = pathname.startsWith("/portal");

  if (isPortalRoute && !user) {
    return withCookies(NextResponse.redirect(new URL("/auth/sign-in", request.url)), response);
  }

  if (isAuthRoute && user) {
    return withCookies(NextResponse.redirect(new URL("/portal", request.url)), response);
  }

  return response;
}

function withCookies(redirect: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
