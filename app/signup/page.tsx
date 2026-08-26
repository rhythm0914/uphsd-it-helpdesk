import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SignUpPage({
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
          <h1 className="text-2xl font-semibold">Create Account</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Request access to the IT Help Desk
          </p>
        </div>

        <form action="/auth/sign-up" method="post" className="space-y-4">
          {message && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-700">{message}</p>
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium mb-2">
              Full Name <span className="text-brand-primary">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email <span className="text-brand-primary">*</span>
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
            <label htmlFor="role" className="block text-sm font-medium mb-2">
              I am a...
            </label>
            <select
              id="role"
              name="role"
              defaultValue="student"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="student">Student</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password <span className="text-brand-primary">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-foreground/50">At least 6 characters</p>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Create Account
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-foreground/60">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-primary hover:text-brand-primary-hover font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
