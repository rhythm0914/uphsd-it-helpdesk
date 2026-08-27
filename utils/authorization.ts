export const ALLOWED_SIGNUP_ROLES = ["student", "employee"] as const;

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
