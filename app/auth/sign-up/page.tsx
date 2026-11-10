import { signUp } from "../actions";
import Link from "next/link";
import Image from "next/image";
import { SubmitButton } from "@/components/ui/submit-button";
import { UPHSD_EMAIL_DOMAIN } from "@/utils/auth/email-domain";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;

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
          <h1 className="text-2xl font-semibold">Create Account</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Request access to the IT Help Desk
          </p>
        </div>

        <form action={signUp} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">
                {decodeURIComponent(error)}
              </p>
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
              UPHSD Email <span className="text-brand-primary">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="you@perpetual.edu.ph"
            />
            <p className="mt-1 text-xs text-foreground/50">
              Must be a valid @{UPHSD_EMAIL_DOMAIN} email address
            </p>
          </div>

          {/* Self-registration creates student accounts only. Employee and
              staff accounts are granted by an administrator, so there is no
              account-type selector to misuse. */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-medium">Student account</p>
            <p className="mt-1 text-xs text-foreground/60">
              This form creates a student account. UPHSD employees are given an
              account by the IT administrator; if you are an employee and need
              access, contact the IT Help Desk.
            </p>
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
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Minimum 8 characters"
            />
            <p className="mt-1 text-xs text-foreground/50">
              Minimum 8 characters
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password <span className="text-brand-primary">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Re-enter your password"
            />
          </div>

          <SubmitButton
            idleLabel="Create Account"
            pendingLabel="Creating Account…"
            className="w-full"
          />
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-foreground/60">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="text-brand-primary hover:text-brand-primary-hover font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
