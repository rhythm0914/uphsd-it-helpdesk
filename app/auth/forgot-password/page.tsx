import { forgotPassword } from "../actions";
import Link from "next/link";
import Image from "next/image";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const message = params?.message;

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
          <h1 className="text-2xl font-semibold">Reset Password</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Enter your email and we will send you a reset link
          </p>
        </div>

        <form action={forgotPassword} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">
                {decodeURIComponent(error)}
              </p>
            </div>
          )}

          {message === "reset_sent" && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-700">
                If an account exists for this email, password reset instructions have been sent.
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
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="you@perpetual.edu.ph"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Send Reset Link
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-foreground/60">
            Remember your password?{" "}
            <Link href="/auth/sign-in" className="text-brand-primary hover:text-brand-primary-hover font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
