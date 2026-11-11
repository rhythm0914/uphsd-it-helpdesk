import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getValidatedReturnTo } from "@/utils/authorization";
import {
  buildSignInRedirect,
  copyResponseCookies,
  getMiddlewareSession,
  isAuthPath,
  isPortalPath,
  shouldSkipAuthRedirectWhenAuthenticated,
  withNoStore,
} from "@/utils/auth/session";

export async function middleware(request: NextRequest) {
  const { response, user } = await getMiddlewareSession(request);
  const { pathname } = request.nextUrl;

  const authRoute = isAuthPath(pathname);
  const portalRoute = isPortalPath(pathname);

  if (portalRoute && !user) {
    return withNoStore(buildSignInRedirect(request, response));
  }

  // Authenticated users visiting auth pages should go to their intended portal
  // destination (validated) or /portal. Recovery/update-password and callback
  // must remain reachable to complete auth flows.
  if (authRoute && user && !shouldSkipAuthRedirectWhenAuthenticated(pathname)) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const destination = getValidatedReturnTo(nextParam, "/portal");
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    return withNoStore(copyResponseCookies(response, redirect));
  }

  if (portalRoute || authRoute) {
    return withNoStore(response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff|woff2|ttf|eot)$).*)",
  ],
};
