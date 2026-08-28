import Link from "next/link";

export const metadata = {
  title: "AI Assistant — Privacy & Transparency Notice — UPHSD IT Help Desk",
};

/**
 * AI Assistant privacy & transparency notice (plain language).
 *
 * Items marked [TO BE CONFIRMED BY UPHSD] are intentional placeholders for
 * organizational/legal inputs that are not defined in this codebase and must
 * NOT be invented (controller identity, DPO contact, retention schedules,
 * legal bases). This page documents actual technical behavior only.
 */
export default function AssistantPrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        AI Assistant — Privacy &amp; Transparency Notice
      </h1>
      <p className="mt-2 text-sm text-foreground/60">
        Applies to the UPHSD IT Help Desk AI Assistant (the &quot;AI
        Assistant&quot;) on this site.
      </p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="text-base font-semibold text-foreground">1. You are interacting with AI</h2>
          <p className="mt-1">
            The AI Assistant is an automated system, not a human IT staff member.
            Responses are AI-generated and may require verification. For official
            answers and hands-on help, submit an IT request.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. What information the assistant receives</h2>
          <p className="mt-1">When you send a message, the assistant receives:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            <li>the text of your question and the recent messages in your current conversation;</li>
            <li>relevant excerpts of published help desk knowledge-base articles (to ground answers);</li>
            <li>a fixed set of server-side instructions for the assistant (not shown here).</li>
          </ul>
          <p className="mt-1">
            It does not receive your password, session tokens, cookies, other
            users&apos; tickets, internal IT staff notes, or unrelated profile
            information. Do not type personal or sensitive information (e.g.,
            passwords, ID numbers, health or disciplinary details) into the chat.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. Why your message is processed</h2>
          <p className="mt-1">
            Solely to generate an answer to your IT question and to suggest the
            appropriate Help Desk request when needed. The assistant is an
            informational support tool only.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4–5. Storage &amp; retention of conversations</h2>
          <p className="mt-1">
            Conversations are <strong>not stored</strong> on our servers. Your
            conversation exists only in your browser while the chat is open and
            is gone when you close or reset it (or close your browser tab).
            Clearing the conversation with the reset control deletes it
            immediately.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6–7. Knowledge base &amp; the AI provider</h2>
          <p className="mt-1">
            To answer, your message and short excerpts of published knowledge
            articles are processed by the AI model running in{" "}
            <strong>Cloudflare Workers AI</strong> (Cloudflare, Inc.).
            Processing happens inside the Help Desk&apos;s own Cloudflare
            Worker; no separate third-party AI vendor account is involved.
          </p>
          <p className="mt-1">
            Only the text described in section 2 is transmitted — nothing else
            about you is attached to the AI request. [Cloudflare Workers AI
            input/logging retention details: TO BE CONFIRMED BY UPHSD against
            current official Cloudflare documentation.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. How long information is kept</h2>
          <p className="mt-1">
            Conversations: not retained (see section 4). Knowledge-base
            articles: retained by the university as part of the Help Desk
            system. [Institutional retention schedule: TO BE CONFIRMED BY
            UPHSD.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Who controls the data</h2>
          <p className="mt-1">
            [Data controller identity and Data Protection Officer contact: TO BE
            CONFIRMED BY UPHSD.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">10. Your rights</h2>
          <p className="mt-1">
            Depending on the applicable law (e.g., the Philippine Data Privacy
            Act of 2012, and other laws that may apply to you), you may have
            rights regarding access, correction, and other matters concerning
            your personal data, and you may object to certain processing.
            Because conversations are not stored, there is generally no chat
            history to access or delete. [How to exercise rights and which
            rights apply: TO BE CONFIRMED BY UPHSD.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">11. Contact</h2>
          <p className="mt-1">
            Privacy questions or requests: [UPHSD privacy contact / DPO details:
            TO BE CONFIRMED BY UPHSD.]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">12. Getting human help instead</h2>
          <p className="mt-1">
            You can skip the AI at any time and submit a request directly to IT
            staff:
          </p>
          <Link
            href="/portal/request"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Submit an IT Request
          </Link>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">About automated decisions</h2>
          <p className="mt-1">
            The AI Assistant does not make decisions about you. It cannot
            approve or deny accounts, change tickets, assign privileges, or make
            academic/employment decisions. All such actions are performed only
            by authorized human staff.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Cookies &amp; tracking</h2>
          <p className="mt-1">
            The AI Assistant itself does not use cookies, browser storage
            (localStorage/sessionStorage), analytics, or third-party tracking.
            The site&apos;s authentication cookies are separate and described by
            the university&apos;s [general privacy notice: TO BE CONFIRMED BY
            UPHSD].
          </p>
        </section>

        <p className="text-xs text-foreground/50">
          This notice describes the assistant&apos;s actual technical behavior.
          References to laws are provided for context only and do not constitute
          legal advice or a claim of legal certification.
        </p>

        <Link href="/portal/assistant" className="inline-block text-sm text-brand-primary hover:underline">
          ← Back to AI Assistant
        </Link>
      </div>
    </div>
  );
}

