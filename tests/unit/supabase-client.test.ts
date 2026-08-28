import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The modules under test read env vars at import time, so make sure the
// expected variables exist before the modules are evaluated.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "test-publishable-key";
});

// Capture calls made to the real Supabase SSR factories so we can assert the
// correct url, key, and cookie-adapter wiring without hitting the network.
const { createServerClient, createBrowserClient, NextResponse } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createBrowserClient: vi.fn(),
  NextResponse: {
    next: vi.fn((init?: { request: unknown }) => ({
      request: init?.request,
      cookies: { set: vi.fn() },
    })),
  },
}));

vi.mock("@supabase/ssr", () => ({ createServerClient, createBrowserClient }));
vi.mock("next/server", () => ({
  NextRequest: class NextRequest {},
  NextResponse,
}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const { createClient: createServerClientHelper } = await import("@/utils/supabase/server");
const { createClient: createBrowserClientHelper } = await import("@/utils/supabase/client");
const { createClient: createMiddlewareClient } = await import("@/utils/supabase/middleware");

// Proper types for the (mock-shaped) arguments instead of `as any` casts.
type ServerCookieStore = Parameters<typeof createServerClientHelper>[0];
type MiddlewareRequest = Parameters<typeof createMiddlewareClient>[0];

describe("supabase server client", () => {
  beforeEach(() => createServerClient.mockReset());

  it("creates a server client with the configured url and publishable key", () => {
    const cookieStore = {
      getAll: vi.fn(() => [{ name: "sb-key", value: "value" }]),
      set: vi.fn(),
    };
    createServerClientHelper(cookieStore as unknown as ServerCookieStore);

    expect(createServerClient).toHaveBeenCalledTimes(1);
    const [url, key] = createServerClient.mock.calls[0];
    expect(url).toBe("https://test-project.supabase.co");
    expect(key).toBe("test-publishable-key");
  });

  it("wires getAll() to the passed cookie store", () => {
    const cookieStore = {
      getAll: vi.fn(() => [{ name: "sb-key", value: "value" }]),
      set: vi.fn(),
    };
    createServerClientHelper(cookieStore as unknown as ServerCookieStore);
    const options = createServerClient.mock.calls[0][2];

    expect(options.cookies.getAll()).toEqual([{ name: "sb-key", value: "value" }]);
  });

  it("wires setAll() to the passed cookie store", () => {
    const cookieStore = { getAll: vi.fn(() => []), set: vi.fn() };
    createServerClientHelper(cookieStore as unknown as ServerCookieStore);
    const setAll = createServerClient.mock.calls[0][2].cookies.setAll;

    setAll([{ name: "sb-key", value: "value", options: { path: "/" } }]);
    expect(cookieStore.set).toHaveBeenCalledWith("sb-key", "value", { path: "/" });
  });
});

describe("supabase browser client", () => {
  beforeEach(() => createBrowserClient.mockReset());

  it("creates a browser client with the configured url and publishable key", () => {
    createBrowserClientHelper();

    expect(createBrowserClient).toHaveBeenCalledTimes(1);
    expect(createBrowserClient.mock.calls[0][0]).toBe(
      "https://test-project.supabase.co",
    );
    expect(createBrowserClient.mock.calls[0][1]).toBe("test-publishable-key");
  });
});

describe("supabase middleware client", () => {
  const realEnv = { ...process.env };

  beforeEach(() => {
    createServerClient.mockReset();
    NextResponse.next.mockClear();
  });
  afterEach(() => {
    process.env = { ...realEnv };
  });

  it("returns a null user and does not create a client when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const { response, user } = await createMiddlewareClient({} as unknown as MiddlewareRequest);

    expect(user).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
    expect(response).toBeDefined();
  });

  it("returns the authenticated user when getUser succeeds", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "u-123" } },
        }),
      },
    });

    const { user } = await createMiddlewareClient({
      cookies: { getAll: () => [] },
    } as unknown as MiddlewareRequest);

    expect(user).toEqual({ id: "u-123" });
  });

  it("returns a null user when getUser rejects", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error("network failure")),
      },
    });

    const { user } = await createMiddlewareClient({
      cookies: { getAll: () => [] },
    } as unknown as MiddlewareRequest);

    expect(user).toBeNull();
  });
});
