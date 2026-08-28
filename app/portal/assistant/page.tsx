import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AssistantChat } from "./assistant-chat";
import { AI_DISCLOSURE, AI_PRIVACY_NOTICE_PATH } from "@/utils/ai/transparency";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "IT Assistant — UPHSD IT Help Desk",
};

export default async function AssistantPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">AI Assistant</h1>
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground/70">
            AI
          </span>
        </div>
        <p className="mt-1 text-sm sm:text-base text-foreground/60">
          Ask IT questions, get guidance, and find the right service. The assistant can&apos;t
          perform actions — for hands-on help, submit an IT request.
        </p>
        {/* AI transparency disclosure — visible before first interaction. */}
        <div
          role="note"
          aria-label="AI disclosure"
          className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground/80"
        >
          <p>{AI_DISCLOSURE}</p>
          <Link
            href={AI_PRIVACY_NOTICE_PATH}
            className="mt-1 inline-block text-xs font-medium text-brand-primary hover:underline"
          >
            About this AI &amp; Privacy Notice
          </Link>
        </div>
      </div>

      <AssistantChat />

      <div className="mt-6 rounded-2xl border border-border bg-background p-4 sm:p-6">
        <p className="text-sm text-foreground/70">
          Need hands-on IT support? The assistant only offers guidance — submit a request and IT
          staff will take it from there.
        </p>
        <Link
          href="/portal/request"
          className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
        >
          Submit an IT Request
        </Link>
      </div>
    </div>
  );
}