import { createClient } from "@/utils/supabase/middleware";
import { getValidatedReturnTo } from "@/utils/authorization";
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
    pathname === "/auth/callback";

  const isPortalRoute = pathname.startsWith("/portal");

  if (isPortalRoute && !user) {
    // Preserve the intended destination so the user lands where they meant to go
    // after authenticating, instead of always bouncing to /portal. The value is
    // re-validated server-side inside the sign-in Action (defense in depth).
    const returnTo = getValidatedReturnTo(pathname);
    return withCookies(
      NextResponse.redirect(
        new URL("/auth/sign-in?next=" + encodeURIComponent(returnTo), request.url),
      ),
      response,
    );
  }

  // `/auth/update-password` must remain reachable by an *authenticated* user:
  // the password-reset recovery flow (PKCE) establishes a session in
  // `/auth/callback` and then sends the user here to set a new password. If we
  // redirected authenticated users away from this route (as we do for
  // sign-in/sign-up/forgot-password), the reset flow would never be able to
  // complete. Unauthenticated users are still allowed through so the form
  // renders (the change action itself enforces the session).
  if (isAuthRoute && user && !pathname.startsWith("/auth/update-password")) {
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
