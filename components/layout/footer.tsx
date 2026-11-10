import Link from "next/link";

/**
 * Site footer. Address and hours come from the task specification (Molino
 * campus). No phone numbers or emails are invented — none exist in the repo,
 * so visitors are directed to the official UPHSD site for current contact
 * details.
 */
export default function Footer() {
  return (
    <footer className="border-t border-border bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-source-serif-4 font-semibold text-primary tracking-tight text-lg">UPHSD</span>
              <span className="text-xs font-semibold text-neutral-900 tracking-wider uppercase">IT Help Desk</span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-6">
              The IT service portal for students and employees of the University
              of Perpetual Help System DALTA – Molino Campus. Submit requests,
              track progress, and confirm when a problem is actually fixed.
            </p>
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-900">Motto:</span>{" "}
              Character Building is Nation Building
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">Campus</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Molino Road, Molino III,<br />
              City of Bacoor, 4102<br />
              Cavite, Philippines
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">Office Hours</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Monday – Friday, 8:00 AM – 5:00 PM<br />
              <span className="font-medium text-neutral-900">Urgent requests:</span> handled around the clock
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">Policies</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/privacy" className="hover:text-primary underline underline-offset-4">Privacy Notice</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary underline underline-offset-4">Terms of Use</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary underline underline-offset-4">Contact IT</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-xs text-neutral-500">
            UPHSD IT Help Desk. For UPHSD students and employees. Requests are
            visible only to you and the IT team handling them.
          </p>
          <div className="flex items-center gap-6 text-xs text-neutral-500">
            <span>University of Perpetual Help System DALTA</span>
            <a href="https://perpetualdalta.edu.ph" className="hover:text-primary underline underline-offset-4" target="_blank" rel="noopener noreferrer">
              Official University Site
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}