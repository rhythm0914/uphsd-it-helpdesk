/**
 * Public self-registration creates STUDENT accounts only.
 *
 * Employee and staff accounts are granted by an administrator from
 * /portal/admin/users, so nobody can self-declare as an employee to reach
 * employee-only reporting or a staff workspace.
 */
export const ALLOWED_SIGNUP_ROLES = ["student"] as const;

export type AllowedSignupRole = (typeof ALLOWED_SIGNUP_ROLES)[number];

export const IT_STAFF_ROLES = ["it_staff", "admin", "manager"] as const;

export const ADMIN_ROLES = ["admin", "manager"] as const;

export function isITStaff(role: string | null | undefined): boolean {
  return !!role && IT_STAFF_ROLES.includes(role as "it_staff" | "admin" | "manager");
}

export function isAdmin(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role as "admin" | "manager");
}

export function normalizeSignupRole(role: string | null | undefined): AllowedSignupRole {
  if (ALLOWED_SIGNUP_ROLES.includes(role as AllowedSignupRole)) {
    return role as AllowedSignupRole;
  }
  return "student";
}

export function isAllowedSignupRole(role: string | null | undefined): role is AllowedSignupRole {
  return ALLOWED_SIGNUP_ROLES.includes(role as AllowedSignupRole);
}

/**
 * Resolve a user-supplied return-to destination to a safe, same-origin,
 * relative path. Returns `defaultPath` (default "/portal") when the value is
 * missing or unsafe.
 *
 * This is the single source of truth for "where to go after sign-in" across the
 * middleware and the sign-in Server Action, so it is always validated server-side
 * (defense in depth) — a value can never be trusted just because the middleware
 * put it in the URL.
 *
 * Security: only a single-slash relative path is accepted. This rejects:
 *   - "//evil.com"        (protocol-relative / open redirect)
 *   - "/\\evil.com"       (backslash host)
 *   - "https://evil.com"  (absolute URL / scheme)
 *   - "mailto:..."        (scheme)
 *   - any value not starting with "/"  (e.g. "evil.com")
 */
export function getValidatedReturnTo(
  next: string | null | undefined,
  defaultPath = "/portal",
): string {
  if (!next) return defaultPath;
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\") ||
    next.includes(":")
  ) {
    return defaultPath;
  }
  return next;
}
