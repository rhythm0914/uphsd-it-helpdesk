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

function decodePathSafely(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * Resolve a user-supplied return-to destination to a safe, same-origin,
 * relative portal path. Returns `defaultPath` (default "/portal") when the
 * value is missing or unsafe.
 *
 * Single source of truth for post-auth redirects (middleware, auth actions,
 * callback, auth pages). Validation is always server-side and defense-in-depth.
 *
 * Accepted: a relative path beginning with "/" that targets /portal (or an
 * allowed /portal subpath). Rejected: protocol-relative URLs, absolute URLs,
 * schemes, backslashes, embedded credentials/hosts, control chars, traversal
 * segments after decoding, and paths outside the portal allowlist.
 */
export function getValidatedReturnTo(
  next: string | null | undefined,
  defaultPath = "/portal",
): string {
  if (typeof next !== "string") return defaultPath;

  const raw = next.trim();
  if (!raw) return defaultPath;

  // Must be a single-slash relative path and never carry a scheme/host form.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return defaultPath;
  }
  // Reject control characters, spaces, and obvious scheme/host separators.
  if (/[\u0000-\u001f\u007f\s]/.test(raw) || raw.includes("://") || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw)) {
    return defaultPath;
  }

  // Decode once for inspection (reject malformed encoding), then normalize.
  const decoded = decodePathSafely(raw);
  if (decoded == null) return defaultPath;
  if (decoded.includes("\\") || decoded.startsWith("//") || /[\u0000-\u001f\u007f]/.test(decoded)) {
    return defaultPath;
  }

  // Strip hash for routing target; query is preserved if safe.
  const withoutHash = decoded.split("#", 1)[0] ?? "";
  const qIndex = withoutHash.indexOf("?");
  const pathPart = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const queryPart = qIndex >= 0 ? withoutHash.slice(qIndex) : "";

  if (!pathPart.startsWith("/") || pathPart.startsWith("//")) return defaultPath;

  // Normalize dot segments and collapse duplicate slashes.
  const segments = pathPart.split("/");
  const normalized: string[] = [];
  for (const seg of segments) {
    if (!seg || seg === ".") continue;
    if (seg === "..") return defaultPath; // traversal outside allowed root
    normalized.push(seg);
  }
  const normalizedPath = "/" + normalized.join("/");

  // Allowlist: authenticated post-login destinations live under /portal.
  if (normalizedPath !== "/portal" && !normalizedPath.startsWith("/portal/")) {
    return defaultPath;
  }

  // Preserve a benign query string (no control chars). If unsafe, drop it.
  let safeQuery = "";
  if (queryPart) {
    const qs = queryPart.startsWith("?") ? queryPart.slice(1) : queryPart;
    if (!/[\u0000-\u001f\u007f]/.test(qs)) {
      safeQuery = "?" + qs;
    }
  }

  return normalizedPath + safeQuery;
}
