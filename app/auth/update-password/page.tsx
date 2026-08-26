import { updatePassword } from "../actions";
import Link from "next/link";
import Image from "next/image";

export default async function UpdatePasswordPage({
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
          <h1 className="text-2xl font-semibold">Set New Password</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Enter your new password below
          </p>
        </div>

        <form action={updatePassword} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">
                {decodeURIComponent(error)}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              New Password <span className="text-brand-primary">*</span>
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
              Confirm New Password <span className="text-brand-primary">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Re-enter your new password"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Update Password
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-foreground/60">
            <Link href="/auth/sign-in" className="text-brand-primary hover:text-brand-primary-hover font-medium">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
