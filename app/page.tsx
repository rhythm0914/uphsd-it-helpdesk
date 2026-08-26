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
} from "@radix-ui/react-icons";

const services = [
  {
    title: "Hardware Support",
    description: "Diagnose and resolve device issues across campus workstations.",
    icon: DesktopIcon,
    image: "https://picsum.photos/seed/hardware-support/600/400",
  },
  {
    title: "Software Installation",
    description: "Deploy licensed applications and configure system preferences.",
    icon: GearIcon,
    image: "https://picsum.photos/seed/software-install/600/400",
  },
  {
    title: "Network Access",
    description: "Restore connectivity, configure Wi-Fi, and manage credentials.",
    icon: PaperPlaneIcon,
    image: "https://picsum.photos/seed/network-access/600/400",
  },
  {
    title: "Account Management",
    description: "Handle user provisioning, resets, and permission changes.",
    icon: LockClosedIcon,
    image: "https://picsum.photos/seed/account-mgmt/600/400",
  },
  {
    title: "Equipment Request",
    description: "Request peripherals, cables, adapters, and shared devices.",
    icon: BarChartIcon,
    image: "https://picsum.photos/seed/equipment-req/600/400",
  },
  {
    title: "System Maintenance",
    description: "Schedule updates, patches, and preventive server care.",
    icon: CheckCircledIcon,
    image: "https://picsum.photos/seed/sys-maint/600/400",
  },
];

const processSteps = [
  {
    step: "01",
    title: "Submit request",
    description:
      "Employees fill a single form with department, location, and service details.",
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
      "Employees confirm resolution and submit a short satisfaction rating.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <span className="text-accent">UPHSD</span> IT Help Desk
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
            <Link href="#reports" className="text-foreground/70 hover:text-foreground transition-colors">
              Reports
            </Link>
            <Link href="#contact" className="text-foreground/70 hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
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
                  IT support that keeps your institution moving
                </h1>
                <p className="mt-6 text-lg md:text-xl text-foreground/70 leading-relaxed max-w-lg">
                  Submit requests, track progress, and get help without leaving your desk. Built for employees and IT staff.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/request"
                    className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-accent/90"
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
                    src="https://picsum.photos/seed/uphsd-campus/800/600"
                    alt="Campus technology infrastructure"
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
                Replace Google Forms and email threads with a single system. Every request gets a tracking ID, every status change is visible, and every completed service is recorded for future reference.
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
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
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
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
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
                  Employees see submitted, pending, in progress, and completed stages. IT staff update status and add work notes as work continues.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= */}
        {/* SECTION 6: REPORTS - CARD GRID */}
        {/* ======================= */}
        <section id="reports" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                  Reports that reflect real operations
                </h2>
                <p className="mt-4 text-lg text-foreground/70 leading-relaxed max-w-lg">
                  Department heads and IT administrators review request volumes, completion rates, and satisfaction scores based on actual records.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Requests this month", value: "147" },
                  { label: "Avg. completion time", value: "2.4 days" },
                  { label: "Satisfaction score", value: "4.6 / 5" },
                  { label: "Active IT staff", value: "8" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-border bg-background p-5"
                  >
                    <p className="text-2xl md:text-3xl font-semibold tracking-tight">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {stat.label}
                    </p>
                  </div>
                ))}
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
                <div className="flex items-center gap-2 text-accent mb-4">
                  <EyeNoneIcon width={24} height={24} />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    Security and privacy
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                  Employee data stays within the institution
                </h2>
                <p className="mt-4 text-lg text-foreground/70 leading-relaxed max-w-lg">
                  Role-based access ensures employees only see their own requests. IT staff and administrators operate under strict authorization checks, and all history is preserved for audit.
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
                Start submitting requests with tracking IDs today. IT staff get the tools to prioritize, assign, and complete work faster.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/request"
                  className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-accent/90"
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
                <span className="text-accent">UPHSD</span> IT Help Desk
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
