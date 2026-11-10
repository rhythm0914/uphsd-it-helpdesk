import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Test configuration — set these as environment variables before running:
//   E2E_STUDENT_A_EMAIL=studentA@perpetual.edu.ph
//   E2E_STUDENT_A_PASSWORD=password123
//   E2E_STUDENT_B_EMAIL=studentB@perpetual.edu.ph
//   E2E_STUDENT_B_PASSWORD=password123
//   E2E_STAFF_EMAIL=staff@perpetual.edu.ph
//   E2E_STAFF_PASSWORD=password123
//
// The database must be seeded with these users (staff with role 'it_staff'
// or 'admin'), plus active services and categories. Email confirmation must
// be enabled in Supabase for the sign-up tests to reflect real behaviour.
// ---------------------------------------------------------------------------

const STUDENT_A_EMAIL = process.env.E2E_STUDENT_A_EMAIL || "studentA@perpetual.edu.ph";
const STUDENT_A_PASSWORD = process.env.E2E_STUDENT_A_PASSWORD || "password123";
const STUDENT_B_EMAIL = process.env.E2E_STUDENT_B_EMAIL || "studentB@perpetual.edu.ph";
const STUDENT_B_PASSWORD = process.env.E2E_STUDENT_B_PASSWORD || "password123";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || "staff@perpetual.edu.ph";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || "password123";

async function signUpStudent(page: any, email: string, password: string) {
  await page.goto("/auth/sign-up");
  await page.fill("#fullName", "Test Student");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#confirmPassword", password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/auth\/sign-in/);
}

async function signIn(page: any, email: string, password: string) {
  await page.goto("/auth/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/portal/);
}

async function submitRequest(
  page: any,
  subject: string,
  description: string,
  priority = "medium",
  urgentReason?: string,
) {
  await page.goto("/portal/request");
  await page.selectOption("#service_id", { index: 1 });
  await page.waitForSelector("#category_id:not([disabled])");
  await page.selectOption("#category_id", { index: 1 });
  await page.fill("#subject", subject);
  await page.fill("#description", description);
  if (priority !== "medium") {
    await page.selectOption("#priority", priority);
    if (urgentReason) {
      await page.check('input[name="urgent_ack"]');
      await page.fill("#urgent_reason", urgentReason);
    }
  }
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/portal\/tickets\//);
  const url = page.url();
  return url.split("/portal/tickets/")[1].split("?")[0].split("#")[0];
}

async function getTicketNumber(page: any) {
  return await page.locator("span.font-mono").first().textContent() || "";
}

test.describe("E2E: Student sign-up", () => {
  test("accepts a UPHSD email address", async ({ page }) => {
    await signUpStudent(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
    await expect(
      page.locator('text=check_email, text=Please check your UPHSD email'),
    ).toBeVisible();
  });

  test("rejects a non-UPHSD email address", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.fill("#fullName", "Bad User");
    await page.fill("#email", "attacker@gmail.com");
    await page.fill("#password", "password123");
    await page.fill("#confirmPassword", "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/auth\/sign-up\?error=/);
  });

  test("rejects a lookalike domain (perpetual.edu.ph.evil.com)", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.fill("#fullName", "Bad User");
    await page.fill("#email", "user@perpetual.edu.ph.evil.com");
    await page.fill("#password", "password123");
    await page.fill("#confirmPassword", "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/auth\/sign-up\?error=/);
  });
});

test.describe("E2E: Ticket workflow (student -> staff -> student)", () => {
  let ticketId: string;
  let ticketNumber: string;

  test.beforeEach(async ({ page }) => {
    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
  });

  test("student submits a request and sees the ticket ID", async ({ page }) => {
    ticketId = await submitRequest(
      page,
      "Cannot connect to Wi-Fi",
      "My laptop will not connect to the campus network in Room 204.",
    );
    ticketNumber = await getTicketNumber(page);
    expect(ticketNumber).toMatch(/^IT-\d{4}-\d{6}$/);
    await expect(page.locator("text=Open")).toBeVisible();
  });

  test("staff requests more information", async ({ page }) => {
    await signIn(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.goto(`/portal/queue/${ticketId}`);
    await page.fill("#info-message", "Please provide your building and room number.");
    await page.click('button:has-text("Request Information")');
    await expect(page.locator("text=Awaiting Student")).toBeVisible();
  });

  test("student replies to the information request", async ({ page }) => {
    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
    await page.goto(`/portal/tickets/${ticketId}`);
    await page.fill('textarea[placeholder*="reply"]', "I am in Building A, Room 204.");
    await page.click('button:has-text("Send Reply")');
    await expect(page.locator("text=Assigned / In Progress")).toBeVisible();
  });

  test("technician marks the ticket Resolved", async ({ page }) => {
    await signIn(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.goto(`/portal/queue/${ticketId}`);
    await page.fill("#resolution_note", "Reset the network adapter and reconnected to Wi-Fi.");
    await page.click('button:has-text("Mark as Resolved")');
    await expect(page.locator("text=Resolved")).toBeVisible();
  });

  test("student clicks Still broken -> same ID, status Reopened", async ({ page }) => {
    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
    await page.goto(`/portal/tickets/${ticketId}`);
    await expect(page.locator("text=Resolved")).toBeVisible();
    await page.click('button:has-text("Still broken")');
    await page.fill("#reason", "The Wi-Fi drops again after 10 minutes.");
    await page.click('button:has-text("Reopen request")');
    await expect(page.locator("text=Reopened")).toBeVisible();
    const number = await getTicketNumber(page);
    expect(number).toBe(ticketNumber);
  });

  test("technician acknowledges the reopen", async ({ page }) => {
    await signIn(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.goto(`/portal/queue/${ticketId}`);
    await page.click('button:has-text("Acknowledge Reopen")');
    await expect(page.locator("text=Assigned / In Progress")).toBeVisible();
  });

  test("resolve again -> Fix works with rating -> Closed (Verified Fixed)", async ({ page }) => {
    await signIn(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.goto(`/portal/queue/${ticketId}`);
    await page.fill("#resolution_note", "Replaced the faulty network card. Connection is stable now.");
    await page.click('button:has-text("Mark as Resolved")');
    await expect(page.locator("text=Resolved")).toBeVisible();

    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
    await page.goto(`/portal/tickets/${ticketId}`);
    await page.click('button:has-text("Fix works")');
    await page.selectOption("#rating", "5");
    await page.fill("#comment", "Fixed quickly, thank you.");
    await page.click('button:has-text("Confirm fix and rate")');
    await expect(page.locator("text=Closed")).toBeVisible();
  });
});

test.describe("E2E: Reject path", () => {
  let ticketId: string;

  test.beforeEach(async ({ page }) => {
    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
    ticketId = await submitRequest(
      page,
      "Request for software installation",
      "Please install Photoshop on my lab computer.",
    );
  });

  test("staff rejects and the requester sees the reason", async ({ page }) => {
    await signIn(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.goto(`/portal/queue/${ticketId}`);
    await page.selectOption("#rejection_category", "not_an_it_issue");
    await page.fill("#reason", "Photoshop is not within IT's supported software list.");
    await page.click('button:has-text("Reject Request")');
    await expect(page.locator("text=Rejected")).toBeVisible();

    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
    await page.goto(`/portal/tickets/${ticketId}`);
    await expect(page.locator("text=Rejected")).toBeVisible();
    await expect(page.locator("text=Not an IT issue")).toBeVisible();
    await expect(
      page.locator("text=Photoshop is not within IT's supported software list."),
    ).toBeVisible();
  });
});

test.describe("E2E: Urgent request", () => {
  let ticketId: string;

  test.beforeEach(async ({ page }) => {
    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
  });

  test("urgent request starts SLA immediately and shows URGENT PRIORITY", async ({ page }) => {
    ticketId = await submitRequest(
      page,
      "Server room is down",
      "The server room AC has failed and equipment is overheating.",
      "urgent",
      "Thesis defense is at 3:00 PM today and the server is down. All student submissions are blocked.",
    );
    await expect(page.locator("text=URGENT PRIORITY")).toBeVisible();
    const number = await getTicketNumber(page);
    expect(number).toMatch(/^IT-\d{4}-\d{6}$/);
  });
});

test.describe("E2E: Data isolation", () => {
  let ticketBId: string;
  let ticketBNumber: string;

  test.beforeEach(async ({ page }) => {
    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
    await submitRequest(page, "Student A ticket", "This belongs to student A.");
    await signIn(page, STUDENT_B_EMAIL, STUDENT_B_PASSWORD);
    ticketBId = await submitRequest(page, "Student B ticket", "This belongs to student B.");
    ticketBNumber = await getTicketNumber(page);
  });

  test("student A cannot open student B's ticket by URL", async ({ page }) => {
    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
    await page.goto(`/portal/tickets/${ticketBId}`);
    await expect(page.locator("text=Ticket Not Found")).toBeVisible();
  });

  test("student A cannot find student B's ticket via Track", async ({ page }) => {
    await signIn(page, STUDENT_A_EMAIL, STUDENT_A_PASSWORD);
    await page.goto("/portal/track");
    await page.fill('input[name="q"]', ticketBNumber || "");
    await page.click('button:has-text("Track")');
    await expect(
      page.locator("text=No request with that ID belongs to your account"),
    ).toBeVisible();
  });
});
