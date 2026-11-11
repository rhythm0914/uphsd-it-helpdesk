# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow.spec.ts >> E2E: Student sign-up >> accepts a UPHSD email address
- Location: tests\e2e\workflow.spec.ts:73:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/auth\/sign-in/
Received string:  "http://localhost:3000/auth/sign-up"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × locator resolved to <html lang="en" class="geist_a71539c9-module__T19VSG__variable geist_mono_8d43a2aa-module__8Li5zG__variable antialiased">…</html>
       - unexpected value "http://localhost:3000/auth/sign-up"

```

```yaml
- link "UPHSD Logo":
  - /url: /
  - img "UPHSD Logo"
- heading "Create Account" [level=1]
- paragraph: Request access to the IT Help Desk
- text: Full Name *
- textbox "Full Name *":
  - /placeholder: Juan Dela Cruz
  - text: Test Student
- text: UPHSD Email *
- textbox "UPHSD Email *":
  - /placeholder: you@perpetual.edu.ph
  - text: studentA@perpetual.edu.ph
- paragraph: Must be a valid @perpetual.edu.ph email address
- paragraph: Student account
- paragraph: This form creates a student account. UPHSD employees are given an account by the IT administrator; if you are an employee and need access, contact the IT Help Desk.
- text: Password *
- textbox "Password *":
  - /placeholder: Minimum 8 characters
  - text: password123
- paragraph: Minimum 8 characters
- text: Confirm Password *
- textbox "Confirm Password *":
  - /placeholder: Re-enter your password
  - text: password123
- button "Loading Creating Account…" [disabled]:
  - status "Loading"
  - text: Creating Account…
- paragraph:
  - text: Already have an account?
  - link "Sign in":
    - /url: /auth/sign-in
- alert
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | // ---------------------------------------------------------------------------
  4   | // Test configuration — set these as environment variables before running:
  5   | //   E2E_STUDENT_A_EMAIL=studentA@perpetual.edu.ph
  6   | //   E2E_STUDENT_A_PASSWORD=password123
  7   | //   E2E_STUDENT_B_EMAIL=studentB@perpetual.edu.ph
  8   | //   E2E_STUDENT_B_PASSWORD=password123
  9   | //   E2E_STAFF_EMAIL=staff@perpetual.edu.ph
  10  | //   E2E_STAFF_PASSWORD=password123
  11  | //
  12  | // The database must be seeded with these users (staff with role 'it_staff'
  13  | // or 'admin'), plus active services and categories. Email confirmation must
  14  | // be enabled in Supabase for the sign-up tests to reflect real behaviour.
  15  | // ---------------------------------------------------------------------------
  16  | 
  17  | const STUDENT_A_EMAIL = process.env.E2E_STUDENT_A_EMAIL || "studentA@perpetual.edu.ph";
  18  | const STUDENT_A_PASSWORD = process.env.E2E_STUDENT_A_PASSWORD || "password123";
  19  | const STUDENT_B_EMAIL = process.env.E2E_STUDENT_B_EMAIL || "studentB@perpetual.edu.ph";
  20  | const STUDENT_B_PASSWORD = process.env.E2E_STUDENT_B_PASSWORD || "password123";
  21  | const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "staff@perpetual.edu.ph";
  22  | const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "password123";
  23  | 
  24  | async function signUpStudent(page: any, email: string, password: string) {
  25  |   await page.goto("/auth/sign-up");
  26  |   await page.fill("#fullName", "Test Student");
  27  |   await page.fill("#email", email);
  28  |   await page.fill("#password", password);
  29  |   await page.fill("#confirmPassword", password);
  30  |   await page.click('button[type="submit"]');
> 31  |   await expect(page).toHaveURL(/\/auth\/sign-in/);
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  32  | }
  33  | 
  34  | async function signIn(page: any, email: string, password: string) {
  35  |   await page.goto("/auth/sign-in");
  36  |   await page.fill("#email", email);
  37  |   await page.fill("#password", password);
  38  |   await page.click('button[type="submit"]');
  39  |   await expect(page).toHaveURL(/\/portal/);
  40  | }
  41  | 
  42  | async function submitRequest(
  43  |   page: any,
  44  |   subject: string,
  45  |   description: string,
  46  |   priority = "normal",
  47  |   urgentReason?: string,
  48  | ) {
  49  |   await page.goto("/portal/request");
  50  |   await page.selectOption("#service_id", { index: 1 });
  51  |   await page.waitForSelector("#category_id:not([disabled])");
  52  |   await page.selectOption("#category_id", { index: 1 });
  53  |   await page.fill("#subject", subject);
  54  |   await page.fill("#description", description);
  55  |   if (priority !== "normal") {
  56  |     await page.selectOption("#priority", priority);
  57  |     if (urgentReason) {
  58  |       await page.check('input[name="urgent_ack"]');
  59  |       await page.fill("#urgent_reason", urgentReason);
  60  |     }
  61  |   }
  62  |   await page.click('button[type="submit"]');
  63  |   await expect(page).toHaveURL(/\/portal\/tickets\//);
  64  |   const url = page.url();
  65  |   return url.split("/portal/tickets/")[1].split("?")[0].split("#")[0];
  66  | }
  67  | 
  68  | async function getTicketNumber(page: any) {
  69  |   return await page.locator("span.font-mono").first().textContent() || "";
  70  | }
  71  | 
  72  | test.describe("E2E: Student sign-up", () => {
  73  |   test("accepts a UPHSD email address", async ({ page }) => {
  74  |     await signUpStudent(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
  75  |     await expect(
  76  |       page.locator('text=check_email, text=Please check your UPHSD email'),
  77  |     ).toBeVisible();
  78  |   });
  79  | 
  80  |   test("rejects a non-UPHSD email address", async ({ page }) => {
  81  |     await page.goto("/auth/sign-up");
  82  |     await page.fill("#fullName", "Bad User");
  83  |     await page.fill("#email", "attacker@gmail.com");
  84  |     await page.fill("#password", "password123");
  85  |     await page.fill("#confirmPassword", "password123");
  86  |     await page.click('button[type="submit"]');
  87  |     await expect(page).toHaveURL(/\/auth\/sign-up\?error=/);
  88  |   });
  89  | 
  90  |   test("rejects a lookalike domain (perpetual.edu.ph.evil.com)", async ({ page }) => {
  91  |     await page.goto("/auth/sign-up");
  92  |     await page.fill("#fullName", "Bad User");
  93  |     await page.fill("#email", "user@perpetual.edu.ph.evil.com");
  94  |     await page.fill("#password", "password123");
  95  |     await page.fill("#confirmPassword", "password123");
  96  |     await page.click('button[type="submit"]');
  97  |     await expect(page).toHaveURL(/\/auth\/sign-up\?error=/);
  98  |   });
  99  | });
  100 | 
  101 | test.describe("E2E: Ticket workflow (student -> staff -> student)", () => {
  102 |   let ticketId: string;
  103 |   let ticketNumber: string;
  104 | 
  105 |   test.beforeEach(async ({ page }) => {
  106 |     await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
  107 |   });
  108 | 
  109 |   test("student submits a request and sees the ticket ID", async ({ page }) => {
  110 |     ticketId = await submitRequest(
  111 |       page,
  112 |       "Cannot connect to Wi-Fi",
  113 |       "My laptop will not connect to the campus network in Room 204.",
  114 |     );
  115 |     ticketNumber = await getTicketNumber(page);
  116 |     expect(ticketNumber).toMatch(/^IT-\d{4}-\d{6}$/);
  117 |     await expect(page.locator("text=Open")).toBeVisible();
  118 |   });
  119 | 
  120 |   test("staff requests more information", async ({ page }) => {
  121 |     await signIn(page, STAFF_EMAIL, STAFF_PASSWORD);
  122 |     await page.goto(`/portal/queue/${ticketId}`);
  123 |     await page.fill("#info-message", "Please provide your building and room number.");
  124 |     await page.click('button:has-text("Request Information")');
  125 |     await expect(page.locator("text=Awaiting Student")).toBeVisible();
  126 |   });
  127 | 
  128 |   test("student replies to the information request", async ({ page }) => {
  129 |     await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
  130 |     await page.goto(`/portal/tickets/${ticketId}`);
  131 |     await page.fill('textarea[placeholder*="reply"]', "I am in Building A, Room 204.");
```