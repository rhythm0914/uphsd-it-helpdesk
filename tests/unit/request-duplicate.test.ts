import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---- Env must exist before modules are imported ----
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "test-publishable-key";
});

// ---- Mock factory functions (hoisted so vi.mock can reference them) ----
const mockFrom = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockEq = vi.hoisted(() => vi.fn());
const mockIn = vi.hoisted(() => vi.fn());
const mockGte = vi.hoisted(() => vi.fn());
const mockOrder = vi.hoisted(() => vi.fn());
const mockLimit = vi.hoisted(() => vi.fn());

const mockChain = {
  select: mockSelect,
  eq: mockEq,
  in: mockIn,
  gte: mockGte,
  order: mockOrder,
  limit: mockLimit,
};

const mockCreateClient = vi.hoisted(() => vi.fn(() => ({
  from: mockFrom,
  auth: {
    getUser: vi.fn(),
  },
})));

vi.mock("@/utils/supabase/server", () => ({
  createClient: mockCreateClient,
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { checkDuplicateTicket } from "@/app/portal/request/actions";

beforeEach(() => {
  vi.resetAllMocks();
  mockFrom.mockReturnValue(mockChain);
  mockSelect.mockReturnValue(mockChain);
  mockEq.mockReturnValue(mockChain);
  mockIn.mockReturnValue(mockChain);
  mockGte.mockReturnValue(mockChain);
  mockOrder.mockReturnValue(mockChain);
  mockLimit.mockResolvedValue({ data: null, error: null });
});

afterEach(() => {
  vi.resetAllMocks();
  mockFrom.mockReturnValue(mockChain);
});

describe("checkDuplicateTicket", () => {
  it("returns no duplicate when user is not signed in", async () => {
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const result = await checkDuplicateTicket("svc_1", "cat_1");

    expect(result.duplicate).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns no duplicate when no recent open ticket exists", async () => {
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user_1" } },
          error: null,
        }),
      },
    });
    mockLimit.mockResolvedValue({ data: [], error: null });

    const result = await checkDuplicateTicket("svc_1", "cat_1");

    expect(result.duplicate).toBe(false);
    expect(mockFrom).toHaveBeenCalledWith("tickets");
    expect(mockEq).toHaveBeenCalledWith("requester_id", "user_1");
    expect(mockEq).toHaveBeenCalledWith("service_id", "svc_1");
    expect(mockEq).toHaveBeenCalledWith("category_id", "cat_1");
    expect(mockIn).toHaveBeenCalledWith(
      "status",
      ["open", "in_progress", "reopened", "waiting_for_user"],
    );
    expect(mockGte).toHaveBeenCalled();
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it("returns duplicate when a recent open ticket exists", async () => {
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user_1" } },
          error: null,
        }),
      },
    });
    mockLimit.mockResolvedValue({
      data: [{ ticket_number: "IT-2026-000123", status: "open" }],
      error: null,
    });

    const result = await checkDuplicateTicket("svc_1", "cat_1");

    expect(result.duplicate).toBe(true);
    expect(result.ticketNumber).toBe("IT-2026-000123");
  });

  it("filters by requester_id so callers cannot probe other users' tickets", async () => {
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user_1" } },
          error: null,
        }),
      },
    });
    mockLimit.mockResolvedValue({ data: [], error: null });

    await checkDuplicateTicket("svc_1", "cat_1");

    const eqCalls = mockEq.mock.calls;
    const requesterCall = eqCalls.find((c) => c[0] === "requester_id");
    expect(requesterCall).toBeDefined();
    expect(requesterCall![1]).toBe("user_1");
  });

  it("only checks the last 24 hours", async () => {
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user_1" } },
          error: null,
        }),
      },
    });
    mockLimit.mockResolvedValue({ data: [], error: null });

    await checkDuplicateTicket("svc_1", "cat_1");

    expect(mockGte).toHaveBeenCalledWith(
      "created_at",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
  });

  it("returns no duplicate on Supabase error", async () => {
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user_1" } },
          error: null,
        }),
      },
    });
    mockLimit.mockRejectedValue(new Error("DB down"));

    const result = await checkDuplicateTicket("svc_1", "cat_1");

    expect(result.duplicate).toBe(false);
  });
});
