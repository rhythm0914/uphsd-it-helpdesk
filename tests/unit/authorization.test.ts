import { describe, it, expect } from "vitest";
import {
  isITStaff,
  isAdmin,
  normalizeSignupRole,
  isAllowedSignupRole,
  ALLOWED_SIGNUP_ROLES,
  IT_STAFF_ROLES,
  ADMIN_ROLES,
  getValidatedReturnTo,
} from "@/utils/authorization";

describe("authorization utilities", () => {
  describe("isITStaff", () => {
    it("allows it_staff, admin, and manager", () => {
      expect(isITStaff("it_staff")).toBe(true);
      expect(isITStaff("admin")).toBe(true);
      expect(isITStaff("manager")).toBe(true);
    });

    it("denies student, employee, and unknown roles", () => {
      expect(isITStaff("student")).toBe(false);
      expect(isITStaff("employee")).toBe(false);
      expect(isITStaff("superadmin")).toBe(false);
      expect(isITStaff(null)).toBe(false);
      expect(isITStaff(undefined)).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("allows admin and manager", () => {
      expect(isAdmin("admin")).toBe(true);
      expect(isAdmin("manager")).toBe(true);
    });

    it("denies student, employee, it_staff, and unknown roles", () => {
      expect(isAdmin("student")).toBe(false);
      expect(isAdmin("employee")).toBe(false);
      expect(isAdmin("it_staff")).toBe(false);
      expect(isAdmin("superadmin")).toBe(false);
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe("normalizeSignupRole", () => {
    it("always returns student, because public signup creates students only", () => {
      expect(normalizeSignupRole("student")).toBe("student");
      expect(normalizeSignupRole("employee")).toBe("student");
      expect(normalizeSignupRole("admin")).toBe("student");
      expect(normalizeSignupRole("manager")).toBe("student");
      expect(normalizeSignupRole("it_staff")).toBe("student");
      expect(normalizeSignupRole("superadmin")).toBe("student");
      expect(normalizeSignupRole(null)).toBe("student");
      expect(normalizeSignupRole(undefined)).toBe("student");
    });
  });

  describe("isAllowedSignupRole", () => {
    it("returns true only for student", () => {
      expect(isAllowedSignupRole("student")).toBe(true);
      expect(isAllowedSignupRole("employee")).toBe(false);
      expect(isAllowedSignupRole("admin")).toBe(false);
      expect(isAllowedSignupRole("manager")).toBe(false);
      expect(isAllowedSignupRole("it_staff")).toBe(false);
    });
  });

  describe("role constants", () => {
    it("does not include privileged roles in public signup", () => {
      expect(ALLOWED_SIGNUP_ROLES).not.toContain("admin");
      expect(ALLOWED_SIGNUP_ROLES).not.toContain("manager");
      expect(ALLOWED_SIGNUP_ROLES).not.toContain("it_staff");
      expect(ALLOWED_SIGNUP_ROLES).not.toContain("employee");
      expect(ALLOWED_SIGNUP_ROLES).toEqual(["student"]);
    });

    it("admin roles are a subset of it_staff roles", () => {
      for (const role of ADMIN_ROLES) {
        expect(IT_STAFF_ROLES).toContain(role);
      }
    });
  });

  describe("getValidatedReturnTo", () => {
    it("accepts safe in-portal paths", () => {
      expect(getValidatedReturnTo("/portal")).toBe("/portal");
      expect(getValidatedReturnTo("/portal/queue")).toBe("/portal/queue");
      expect(getValidatedReturnTo("/portal/queue/123")).toBe("/portal/queue/123");
      expect(getValidatedReturnTo("/portal/request?from=home")).toBe("/portal/request?from=home");
      expect(getValidatedReturnTo("/portal//queue")).toBe("/portal/queue");
      expect(getValidatedReturnTo(null)).toBe("/portal");
      expect(getValidatedReturnTo(undefined)).toBe("/portal");
      expect(getValidatedReturnTo("")).toBe("/portal");
    });

    it("rejects open redirects and protocol/host tricks", () => {
      expect(getValidatedReturnTo("//evil.com")).toBe("/portal");
      expect(getValidatedReturnTo("https://evil.com")).toBe("/portal");
      expect(getValidatedReturnTo("http://evil.com")).toBe("/portal");
      expect(getValidatedReturnTo("/\\evil.com")).toBe("/portal");
      expect(getValidatedReturnTo("\\\\evil.com")).toBe("/portal");
      expect(getValidatedReturnTo("javascript:alert(1)")).toBe("/portal");
      expect(getValidatedReturnTo("mailto:test@example.com")).toBe("/portal");
      expect(getValidatedReturnTo("evil.com")).toBe("/portal");
      expect(getValidatedReturnTo("/portal:evil")).toBe("/portal");
    });

    it("rejects encoded and traversal attacks", () => {
      expect(getValidatedReturnTo("%2F%2Fevil.com")).toBe("/portal");
      expect(getValidatedReturnTo("/%2e%2e/secret")).toBe("/portal");
      expect(getValidatedReturnTo("/portal/../admin")).toBe("/portal");
      expect(getValidatedReturnTo("/portal/%2e%2e/%2e%2e/etc/passwd")).toBe("/portal");
      expect(getValidatedReturnTo("/%5Cevil.com")).toBe("/portal");
      expect(getValidatedReturnTo("/portal%0d%0aLocation:%20https://evil.com")).toBe("/portal");
    });

    it("rejects paths outside the portal allowlist", () => {
      expect(getValidatedReturnTo("/")).toBe("/portal");
      expect(getValidatedReturnTo("/auth/sign-in")).toBe("/portal");
      expect(getValidatedReturnTo("/admin")).toBe("/portal");
      expect(getValidatedReturnTo("/api/assistant")).toBe("/portal");
    });
  });
});
