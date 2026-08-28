import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { UserMenu } from "@/components/UserMenu";
import {
  DesktopIcon,
  GearIcon,
  LockClosedIcon,
  BarChartIcon,
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
  },
  {
    title: "University Email",
    description: "Configure mail clients, recover inbox access, and resolve delivery problems.",
    icon: PaperPlaneIcon,
  },
  {
    title: "Network & Wi-Fi",
    description: "Restore connectivity, configure wireless access, and manage network credentials.",
    icon: BarChartIcon,
  },
  {
    title: "Computer & Hardware",
    description: "Diagnose workstation issues, replace peripherals, and repair classroom equipment.",
    icon: DesktopIcon,
  },
  {
    title: "Software & Applications",
    description: "Install licensed applications, update systems, and configure course-related software.",
    icon: GearIcon,
  },
  {
    title: "General IT Assistance",
    description: "Get help with technology questions, lab access, and other IT support needs.",
    icon: QuestionMarkIcon,
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
    question: "What are the IT Help Desk business hours?",
    answer:
      "Monday through Friday, 8:00 AM to 5:00 PM. Requests submitted outside these hours will be processed on the next business day.",
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

export default async function Home() {
  // Authenticated state for the landing-page nav. Signed-in users see their
  // profile button; signed-out users keep the Sign In link. This reads the
  // existing session/profile — no new auth logic or schema.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { full_name: string | null; email: string | null; role: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name,email,role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <div className="flex flex-col flex-1">
      <nav className="sticky top-0 z-50 border-b border-border bg-background">
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
            <Link href="#services" className="text-foreground/70 hover:text-brand-primary transition-colors">
              Services
            </Link>
            <Link href="#process" className="text-foreground/70 hover:text-brand-primary transition-colors">
              How It Works
            </Link>
            <Link href="#tracking" className="text-foreground/70 hover:text-brand-primary transition-colors">
              Tracking
            </Link>
            <Link href="#faq" className="text-foreground/70 hover:text-brand-primary transition-colors">
              FAQ
            </Link>
            {profile ? (
              <UserMenu
                name={profile.full_name}
                email={profile.email}
                role={profile.role}
              />
            ) : (
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* ======================= */}
        {/* SECTION 1: HERO */}
        {/* ======================= */}
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-6 pt-16 md:pt-24 pb-16 md:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-primary mb-4">
                  UPHSD IT Help Desk
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] text-foreground">
                  Technology support for students and employees
                </h1>
                <p className="mt-6 text-lg md:text-xl text-foreground/70 leading-relaxed max-w-lg">
                  The IT Help Desk assists UPHSD students and employees with common technology concerns, from account access to classroom equipment.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/portal/request"
                    className="inline-flex items-center justify-center rounded-full bg-brand-primary px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
                  >
                    Submit a Request
                  </Link>
                  <Link
                    href="#services"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-background px-8 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-surface"
                  >
                    View Services
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border">
                  <Image
                    src="/MOLINO-Campus-Facade-2.2.jpg"
                    alt="University of Perpetual Help System DALTA Molino Campus facade"
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
        {/* SECTION 2: PROBLEM/SOLUTION */}
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
        {/* SECTION 3: SERVICES */}
        {/* ======================= */}
        <section id="services" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Our Services</h2>
              <p className="mt-4 text-lg text-foreground/70 max-w-2xl mx-auto">
                Common technology support areas for students and employees.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="group rounded-2xl border border-border bg-background p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <service.icon width={20} height={20} />
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 4: PROCESS */}
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
        {/* SECTION 5: TRACKING */}
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
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold-light px-2.5 py-1 text-xs font-medium text-brand-primary">
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
        {/* SECTION 6: FAQ */}
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
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                        <QuestionMarkIcon width={14} height={14} />
                      </span>
                      {item.question}
                    </h3>
                    <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 7: BUSINESS HOURS + SECURITY */}
        {/* ======================= */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              <div className="relative order-2 lg:order-1">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border">
                  <Image
                    src="/image_6487327-scaled-1.webp"
                    alt="University of Perpetual Help System DALTA building facade with the university emblem"
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
                <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
                  <h3 className="text-base font-semibold tracking-tight flex items-center gap-2 mb-2">
                    <ClockIcon width={18} height={18} className="text-brand-primary" />
                    IT Help Desk Business Hours
                  </h3>
                  <p className="text-sm text-foreground/70">
                    Monday – Friday, 8:00 AM – 5:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 8: FINAL CTA */}
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
                  href="/portal/request"
                  className="inline-flex items-center justify-center rounded-full bg-brand-primary px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover"
                >
                  Submit a Request
                </Link>
                 <Link
                   href="/auth/sign-in"
                   className="inline-flex items-center justify-center rounded-full border border-border bg-background px-8 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-surface"
                 >
                   Sign In
                 </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-brand-primary text-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="font-semibold text-white">
                UPHSD IT Help Desk
              </p>
              <p className="mt-1 text-sm text-white/70">
                University of Perpetual Help System DALTA
              </p>
              <p className="mt-1 text-sm text-white/70">
                Monday – Friday, 8:00 AM – 5:00 PM
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 text-sm text-white/70">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Notice
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Use
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact IT
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-xs text-white/50">
              UPHSD IT Help Desk. Internal use only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
