import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/portal");
  }

  const params = await searchParams;
  const message = params?.message;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img
              src="/branding/uphsd-logo.png"
              alt="UPHSD Logo"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          <h1 className="text-2xl font-semibold">Sign In</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Access the IT Help Desk portal
          </p>
        </div>

        <form action="/auth/sign-in" method="post" className="space-y-4">
          {message && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{message}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-foreground/60">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-brand-primary hover:text-brand-primary-hover font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
