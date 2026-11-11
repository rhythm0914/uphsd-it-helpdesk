import { signIn, resendConfirmation } from "../actions";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/utils/supabase/server";
import { getValidatedReturnTo } from "@/utils/authorization";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    email?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const message = params?.message;
  const email = params?.email;
  const next = getValidatedReturnTo(params?.next, "/portal");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(next);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Image
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

        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          {error && error !== "email_not_confirmed" && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
            </div>
          )}

          {error === "email_not_confirmed" && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">
                Please confirm your email address before signing in.
              </p>
            </div>
          )}

          {message && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-700">
                {message === "check_email" &&
                  "Please check your UPHSD email to verify your account before signing in."}
                {message === "password_updated" &&
                  "Password updated successfully. Please sign in."}
                {message === "confirmation_sent" &&
                  "If an account exists for this email, a new confirmation email has been sent."}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              defaultValue={email || ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="you@perpetual.edu.ph"
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
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary hover:text-primary-hover font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <SubmitButton idleLabel="Sign In" pendingLabel="Signing In…" className="w-full" />
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-foreground/60">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/sign-up"
              className="text-primary hover:text-primary-hover font-medium"
            >
              Create account
            </Link>
          </p>
        </div>

        {error === "email_not_confirmed" && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-foreground/60 text-center mb-3">
              Didn&apos;t receive a confirmation email?
            </p>
            <form action={resendConfirmation} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <div>
                <label htmlFor="resend-email" className="block text-sm font-medium mb-2">
                  UPHSD Email
                </label>
                <input
                  type="email"
                  id="resend-email"
                  name="email"
                  required
                  defaultValue={email}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="you@perpetual.edu.ph"
                />
              </div>
              <SubmitButton
                idleLabel="Resend Confirmation Email"
                pendingLabel="Sending…"
                variant="outline"
                className="w-full px-6 py-2 text-sm"
              />
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
