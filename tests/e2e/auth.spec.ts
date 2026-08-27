import { test, expect } from "@playwright/test";

test.describe("Public authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("homepage loads and sign in link works", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/UPHSD/);
    await page.click('a[href="/auth/sign-in"]');
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("sign in page renders email and password fields", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText("Sign In");
  });

  test("sign up page renders required fields", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.locator("#fullName")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#role")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText("Create Account");
  });

  test("sign up rejects non-UPHSD email", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.fill("#fullName", "Test User");
    await page.fill("#email", "test@gmail.com");
    await page.selectOption("#role", "student");
    await page.fill("#password", "password123");
    await page.fill("#confirmPassword", "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/auth\/sign-up\?error=/);
  });

  test("sign up enforces password minimum length", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.fill("#fullName", "Test User");
    await page.fill("#email", "test@perpetual.edu.ph");
    await page.selectOption("#role", "student");
    await page.fill("#password", "short");
    await page.fill("#confirmPassword", "short");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/auth\/sign-up\?error=/);
  });

  test("sign up enforces password confirmation match", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.fill("#fullName", "Test User");
    await page.fill("#email", "test@perpetual.edu.ph");
    await page.selectOption("#role", "student");
    await page.fill("#password", "password123");
    await page.fill("#confirmPassword", "differentpassword");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/auth\/sign-up\?error=/);
  });

  test("unauthenticated user is redirected from portal to sign in", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("forgot password page renders email field", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText("Send Reset Link");
  });
});
