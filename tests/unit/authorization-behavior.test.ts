import { describe, it, expect } from "vitest";
import { normalizeSignupRole, isAllowedSignupRole, isITStaff, isAdmin } from "@/utils/authorization";

describe("signup role validation", () => {
  it("normalizes unknown roles to student", () => {
    expect(normalizeSignupRole("admin")).toBe("student");
    expect(normalizeSignupRole("manager")).toBe("student");
    expect(normalizeSignupRole("it_staff")).toBe("student");
    expect(normalizeSignupRole("superadmin")).toBe("student");
    expect(normalizeSignupRole(null)).toBe("student");
    expect(normalizeSignupRole(undefined)).toBe("student");
  });

  it("preserves allowed signup roles", () => {
    expect(normalizeSignupRole("student")).toBe("student");
    expect(normalizeSignupRole("employee")).toBe("employee");
  });

  it("identifies allowed signup roles", () => {
    expect(isAllowedSignupRole("student")).toBe(true);
    expect(isAllowedSignupRole("employee")).toBe(true);
    expect(isAllowedSignupRole("admin")).toBe(false);
    expect(isAllowedSignupRole("manager")).toBe(false);
    expect(isAllowedSignupRole("it_staff")).toBe(false);
  });

  it("prevents privileged role assignment through public signup", () => {
    const privilegedRoles = ["admin", "manager", "it_staff"];
    for (const role of privilegedRoles) {
      expect(isAllowedSignupRole(role)).toBe(false);
      expect(normalizeSignupRole(role)).toBe("student");
    }
  });
});

describe("authorization role checks", () => {
  it("admin and manager are considered admin", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("manager")).toBe(true);
  });

  it("it_staff, admin, and manager are considered IT staff", () => {
    expect(isITStaff("it_staff")).toBe(true);
    expect(isITStaff("admin")).toBe(true);
    expect(isITStaff("manager")).toBe(true);
  });

  it("student and employee are not staff or admin", () => {
    expect(isITStaff("student")).toBe(false);
    expect(isITStaff("employee")).toBe(false);
    expect(isAdmin("student")).toBe(false);
    expect(isAdmin("employee")).toBe(false);
  });

  it("unknown roles are denied privileged access", () => {
    expect(isITStaff("unknown")).toBe(false);
    expect(isAdmin("unknown")).toBe(false);
    expect(isITStaff(null)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
