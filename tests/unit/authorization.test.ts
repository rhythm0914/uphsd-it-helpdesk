import { describe, it, expect } from "vitest";
import {
  isITStaff,
  isAdmin,
  normalizeSignupRole,
  isAllowedSignupRole,
  ALLOWED_SIGNUP_ROLES,
  IT_STAFF_ROLES,
  ADMIN_ROLES,
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
    it("returns student as default for unknown roles", () => {
      expect(normalizeSignupRole("student")).toBe("student");
      expect(normalizeSignupRole("employee")).toBe("employee");
      expect(normalizeSignupRole("admin")).toBe("student");
      expect(normalizeSignupRole("manager")).toBe("student");
      expect(normalizeSignupRole("it_staff")).toBe("student");
      expect(normalizeSignupRole("superadmin")).toBe("student");
      expect(normalizeSignupRole(null)).toBe("student");
      expect(normalizeSignupRole(undefined)).toBe("student");
    });
  });

  describe("isAllowedSignupRole", () => {
    it("returns true only for student and employee", () => {
      expect(isAllowedSignupRole("student")).toBe(true);
      expect(isAllowedSignupRole("employee")).toBe(true);
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
    });

    it("admin roles are a subset of it_staff roles", () => {
      for (const role of ADMIN_ROLES) {
        expect(IT_STAFF_ROLES).toContain(role);
      }
    });
  });
});
