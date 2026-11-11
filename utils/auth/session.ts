import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { getValidatedReturnTo } from "@/utils/authorization";

export type SessionResult = {
  supabase: ReturnType<typeof createServerClient>;
  response: NextResponse;
  user: User | null;
};

function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function isPortalPath(pathname: string): boolean {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

export function isAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth/")
  );
}

export function shouldSkipAuthRedirectWhenAuthenticated(pathname: string): boolean {
  return pathname.startsWith("/auth/update-password") || pathname === "/auth/callback";
}

export function copyResponseCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

export function getSafeNextFromPath(pathname: string, search = ""): string {
  return getValidatedReturnTo(`${pathname}${search || ""}`);
}

export function buildSignInRedirect(request: NextRequest, sourceResponse: NextResponse): NextResponse {
  const next = getSafeNextFromPath(request.nextUrl.pathname, request.nextUrl.search);
  const redirect = NextResponse.redirect(
    new URL(`/auth/sign-in?next=${encodeURIComponent(next)}`, request.url),
  );
  return copyResponseCookies(sourceResponse, redirect);
}

export function withNoStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie");
  return response;
}

/**
 * Create a middleware-bound Supabase SSR client that:
 * - reads cookies from the incoming request
 * - persists refreshed/updated cookies onto the outgoing response with options
 * - refreshes/validates the session via `auth.getUser()` (server-trusted)
 */
export async function getMiddlewareSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request });

  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    return {
      supabase: null as unknown as ReturnType<typeof createServerClient>,
      response,
      user: null,
    };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        // Keep request cookies in sync so subsequent reads in this cycle see them.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Recreate the response so it carries the updated request cookie state.
        response = NextResponse.next({ request });
        // Persist cookies on the outgoing response with their full options.
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch {
    user = null;
  }

  return { supabase, response, user };
}
