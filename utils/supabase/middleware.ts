import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function createClient(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.next({ request: { headers: request.headers } });
    }

    let supabaseResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value }) =>
              supabaseResponse.cookies.set(name, value)
            );
          },
        },
      },
    );

    try {
      await supabase.auth.getUser();
    } catch {
      // Ignore auth refresh errors in middleware
    }

    return supabaseResponse;
  } catch {
    // If anything fails, return a plain response to avoid crashing the site
    return NextResponse.next({ request: { headers: request.headers } });
  }
}
