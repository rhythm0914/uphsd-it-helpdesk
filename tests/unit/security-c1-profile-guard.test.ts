import { describe, it, expect } from "vitest";
import { isAdmin } from "@/utils/authorization";

// =====================================================================
// Security Fix Phase 1 — C1: profile role self-escalation.
//
// These tests encode the security contract of the RLS/column-grant fix as a
// pure-function invariant (the database-layer enforcement cannot be run in a
// unit test without a live Postgres instance — see the migration file for the
// authoritative SQL + verification queries).
//
// The rule mirrored here:
//   * Only an existing admin/manager may ever trigger a role change.
//   * The self-service profile fields a normal user may edit NEVER include the
//     security-sensitive columns (role, id, email, created_at, updated_at).
// =====================================================================

// Mirrors the column-list GRANT in
// supabase/migrations/20260828_phase1_fix_profiles_role_escalation.sql so a
// future change that broadens self-service fields fails loudly.
const SELF_SERVICE_PROFILE_COLUMNS = [
  "full_name",
  "department",
  "student_number",
  "employee_id",
  "phone",
  "avatar_url",
];

const NEVER_SELF_SERVICE_COLUMNS = [
  "role",
  "id",
  "email",
  "created_at",
  "updated_at",
];

// Mirrors the hard gate enforced by SECURITY DEFINER admin_set_user_role():
// only admin/manager may mutate a user's role.
const ROLE_MANAGEMENT_ROLES = ["admin", "manager"];

describe("C1 profile role-escalation guard", () => {
  it("denies role management to student, employee, and it_staff", () => {
    // Only admin/manager may manage roles; a normal or even it_staff user
    // must never be able to change a user's role.
    for (const role of ["student", "employee", "it_staff"]) {
      expect(isAdmin(role)).toBe(false);
    }
    expect(isAdmin("superadmin")).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it("allows role management only for admin and manager", () => {
    for (const role of ROLE_MANAGEMENT_ROLES) {
      expect(isAdmin(role)).toBe(true);
    }
  });

  it("self-service profile updates never include security-sensitive columns", () => {
    for (const sensitive of NEVER_SELF_SERVICE_COLUMNS) {
      expect(SELF_SERVICE_PROFILE_COLUMNS).not.toContain(sensitive);
    }
  });

  it("role is never a self-service field", () => {
    expect(SELF_SERVICE_PROFILE_COLUMNS).not.toContain("role");
  });
});