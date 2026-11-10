// The institutional email domain, in one place.
//
// Previously the domain was a string literal duplicated in the sign-up action
// and the resend-confirmation action, and the comparison was case-sensitive, so
// "Juan@Perpetual.EDU.PH" was wrongly rejected. Both now use this module.
//
// The check is deliberately an exact domain match: it must not accept
// "x@perpetual.edu.ph.evil.com" or a subdomain such as "x@mail.perpetual.edu.ph".

export const UPHSD_EMAIL_DOMAIN = "perpetual.edu.ph";

/** Trim and lower-case an address so domain checks are case-insensitive. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** True when the address belongs to the UPHSD institutional domain. */
export function isUphsdEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  return normalized.slice(at + 1) === UPHSD_EMAIL_DOMAIN;
}

/** The exact phrase the auth UI shows when the domain is wrong. */
export const UPHSD_EMAIL_ERROR =
  "Please use your UPHSD institutional email address (@" + UPHSD_EMAIL_DOMAIN + ").";
