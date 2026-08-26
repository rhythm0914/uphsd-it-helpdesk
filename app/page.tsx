import Image from "next/image";
import Link from "next/link";
import {
  DesktopIcon,
  GearIcon,
  LockClosedIcon,
  BarChartIcon,
  CheckCircledIcon,
  ClockIcon,
  PaperPlaneIcon,
  EyeNoneIcon,
  QuestionMarkIcon,
} from "@radix-ui/react-icons";

const services = [
  {
    title: "Account & Password",
    description: "Reset credentials, recover access, and manage university account issues.",
    icon: LockClosedIcon,
    image: "https://picsum.photos/seed/account-password/600/400",
  },
  {
    title: "University Email",
    description: "Configure mail clients, recover inbox access, and resolve delivery problems.",
    icon: PaperPlaneIcon,
    image: "https://picsum.photos/seed/university-email/600/400",
  },
  {
    title: "Network & Wi-Fi",
    description: "Restore connectivity, configure wireless access, and manage network credentials.",
    icon: BarChartIcon,
    image: "https://picsum.photos/seed/network-wifi/600/400",
  },
  {
    title: "Computer & Hardware",
    description: "Diagnose workstation issues, replace peripherals, and repair classroom equipment.",
    icon: DesktopIcon,
    image: "https://picsum.photos/seed/computer-hardware/600/400",
  },
  {
    title: "Software & Applications",
    description: "Install licensed applications, update systems, and configure course-related software.",
    icon: GearIcon,
    image: "https://picsum.photos/seed/software-apps/600/400",
  },
  {
    title: "General IT Assistance",
    description: "Get help with technology questions, lab access, and other IT support needs.",
    icon: QuestionMarkIcon,
    image: "https://picsum.photos/seed/general-it-help/600/400",
  },
];

const processSteps = [
  {
    step: "01",
    title: "Submit request",
    description:
      "Students and employees fill a single form with service details, location, and schedule.",
  },
  {
    step: "02",
    title: "IT reviews",
    description:
      "Staff triage requests by priority and assign to the right technician.",
  },
  {
    step: "03",
    title: "Process service",
    description:
      "The assigned team updates status and adds work remarks in real time.",
  },
  {
    step: "04",
    title: "Complete and evaluate",
    description:
      "Requestors confirm resolution and submit a short satisfaction rating.",
  },
];

const faqItems = [
  {
    question: "How do I request IT assistance?",
    answer:
      "Use the Request IT Service form to submit your request. You will receive a tracking ID to monitor progress.",
  },
  {
    question: "Who can use the IT Help Desk?",
    answer:
      "All UPHSD students and employees can submit requests. IT staff and administrators have separate workspaces.",
  },
  {
    question: "How do I track my request?",
    answer:
      "Use the Track Request page with your Request ID to see current status, updates, and history.",
  },
  {
    question: "What happens after my request is completed?",
    answer:
      "You will receive a notification and can submit a short evaluation to help improve IT services.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/branding/uphsd-logo.png"
              alt="UPHSD Logo"
              width={120}
              height={40}
              className="h-8 w-auto md:h-10"
              priority
            />
            <span className="hidden sm:inline text-sm font-medium text-foreground/70 border-l border-border pl-3">
              IT Help Desk
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#services" className="text-foreground/70 hover:text-foreground transition-colors">
              Services
            </Link>
            <Link href="#process" className="text-foreground/70 hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="#tracking" className="text-foreground/70 hover:text-foreground transition-colors">
              Tracking
            </Link>
            <Link href="#faq" className="text-foreground/70 hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ======================= */}
        {/* SECTION 1: HERO - SPLIT HERO */}
        {/* ======================= */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 pt-20 md:pt-24 pb-16 md:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              <div className="max-w-xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] text-foreground">
                  IT support for students and employees
                </h1>
                <p className="mt-6 text-lg md:text-xl text-foreground/70 leading-relaxed max-w-lg">
                  Submit requests, track progress, and get help without leaving your desk. Built for the UPHSD community.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/request"
                    className="inline-flex items-center justify-center rounded-full bg-brand-primary px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
                  >
                    Request IT Service
                  </Link>
                  <Link
                    href="/track"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-background px-8 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-surface"
                  >
                    Track Request
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                  <Image
                    src="https://picsum.photos/seed/uphsd-campus-tech/800/600"
                    alt="Campus technology support"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 2: PROBLEM/SOLUTION - EDITORIAL BAND */}
        {/* ======================= */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                From scattered forms to one clear flow
              </h2>
              <p className="mt-6 text-lg md:text-xl text-foreground/70 leading-relaxed">
                Replace email threads and paper forms with a single system. Every request gets a tracking ID, every status change is visible, and every completed service is recorded for future reference.
              </p>
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 3: SERVICES - BENTO GRID */}
        {/* ======================= */}
        <section id="services" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => {
                const isLarge = index === 0 || index === 3;
                return (
                  <div
                    key={service.title}
                    className={`group relative overflow-hidden rounded-2xl border border-border bg-background transition-shadow hover:shadow-lg ${
                      isLarge ? "md:col-span-2 lg:col-span-1" : ""
                    }`}
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src={service.image}
                        alt={service.title}
                        width={600}
                        height={400}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                          <service.icon width={20} height={20} />
                        </span>
                        <h3 className="text-lg font-semibold tracking-tight">
                          {service.title}
                        </h3>
                      </div>
                      <p className="mt-3 text-sm text-foreground/70 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 4: PROCESS - VERTICAL TIMELINE */}
        {/* ======================= */}
        <section id="process" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                  How requests move through the system
                </h2>
                <p className="mt-4 text-lg text-foreground/70 leading-relaxed max-w-lg">
                  Each step is visible to the right people at the right time. No lost tickets, no duplicate follow-ups.
                </p>
              </div>
              <div className="relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border hidden sm:block" />
                <div className="space-y-8">
                  {processSteps.map((item) => (
                    <div key={item.step} className="relative flex gap-6">
                      <div className="flex-shrink-0">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">
                          {item.step}
                        </span>
                      </div>
                      <div className="pt-1">
                        <h3 className="text-base font-semibold tracking-tight">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm text-foreground/70 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 5: TRACKING - SPLIT SHOWCASE */}
        {/* ======================= */}
        <section id="tracking" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                  <div className="rounded-xl border border-border bg-background p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">
                        Request Status
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <ClockIcon width={12} height={12} />
                        In Progress
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-foreground/50">Request ID</p>
                        <p className="text-sm font-mono font-medium">IT-2026-000123</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-foreground/50">Service</p>
                          <p className="text-sm font-medium">Network Access</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground/50">Location</p>
                          <p className="text-sm font-medium">Room 204</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-foreground/50">Latest Update</p>
                        <p className="text-sm text-foreground/70">
                          Cable replacement scheduled for tomorrow at 10:00 AM.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                  Track every request in real time
                </h2>
                <p className="mt-4 text-lg text-foreground/70 leading-relaxed max-w-lg">
                  Students and employees see submitted, pending, in progress, and completed stages. IT staff update status and add work notes as work continues.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 6: FAQ - VERTICAL STACK */}
        {/* ======================= */}
        <section id="faq" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-center">
                Common questions
              </h2>
              <p className="mt-4 text-lg text-foreground/70 leading-relaxed text-center max-w-2xl mx-auto">
                Quick answers for students and employees. For detailed procedures, contact the IT department.
              </p>
              <div className="mt-12 space-y-6">
                {faqItems.map((item) => (
                  <div
                    key={item.question}
                    className="rounded-2xl border border-border bg-background p-6"
                  >
                    <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                      <QuestionMarkIcon width={18} height={18} className="text-brand-primary" />
                      {item.question}
                    </h3>
                    <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link
                  href="/knowledge-base"
                  className="text-sm font-medium text-brand-primary hover:text-brand-primary-hover transition-colors"
                >
                  View full knowledge base
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 7: SECURITY - IMAGE SPLIT */}
        {/* ======================= */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              <div className="relative order-2 lg:order-1">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                  <Image
                    src="https://picsum.photos/seed/security-privacy/800/600"
                    alt="Secure data handling"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-2 text-brand-primary mb-4">
                  <EyeNoneIcon width={24} height={24} />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    Security and privacy
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                  Student and employee data stays within the institution
                </h2>
                <p className="mt-4 text-lg text-foreground/70 leading-relaxed max-w-lg">
                  Role-based access ensures students and employees only see their own requests. IT staff and administrators operate under strict authorization checks, and all history is preserved for audit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 8: FINAL CTA - EDITORIAL CTA */}
        {/* ======================= */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                Ready to streamline your IT support
              </h2>
              <p className="mt-4 text-lg text-foreground/70 leading-relaxed">
                Start submitting requests with tracking IDs today. Students and employees get the tools to request help, track progress, and evaluate service.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/request"
                  className="inline-flex items-center justify-center rounded-full bg-brand-primary px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
                >
                  Request IT Service
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background px-8 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-surface"
                >
                  Staff Login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="font-semibold text-foreground">
                UPHSD IT Help Desk
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                University of Perpetual Help System DALTA
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 text-sm text-foreground/60">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Notice
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Use
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact IT
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-foreground/50">
              UPHSD IT Help Desk. Internal use only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
