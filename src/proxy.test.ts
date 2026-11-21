import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Proxy tests (MVP.md §8.1, §8.2).
 *
 * The block list is mocked so these stay hermetic: a proxy test must not need a
 * database, and the matching logic itself is covered by ip.test.ts.
 */

let blockEntries: string[] = [];

vi.mock("@/lib/security/blocks", () => ({
  getActiveBlockEntries: async () => blockEntries,
  invalidateBlockCache: () => {},
}));

const { proxy } = await import("./proxy");
const { resetLimiter } = await import("@/lib/security/proxy-limiter");

function request(path: string, host: string, ip?: string) {
  const headers: Record<string, string> = { host };
  if (ip) headers["x-forwarded-for"] = ip;
  return new NextRequest(new URL(`https://${host}${path}`), { headers });
}

const ROOT = "junaedhossain.com";
const ADMIN = "admin.junaedhossain.com";

beforeEach(() => {
  blockEntries = [];
  resetLimiter();
});

describe("proxy — admin host", () => {
  it("adds the noindex header to admin responses", async () => {
    const response = await proxy(request("/", ADMIN));
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive, nosnippet",
    );
  });

  it("rewrites the admin root to /admin", async () => {
    const response = await proxy(request("/", ADMIN));
    expect(response.headers.get("x-middleware-rewrite")).toContain("/admin");
  });

  it("rewrites a bare admin path under /admin", async () => {
    const response = await proxy(request("/login", ADMIN));
    expect(response.headers.get("x-middleware-rewrite")).toContain("/admin/login");
  });

  it("does not double-prefix a path already under /admin", async () => {
    const response = await proxy(request("/admin/posts", ADMIN));
    const rewritten = response.headers.get("x-middleware-rewrite") ?? "";
    expect(rewritten).not.toContain("/admin/admin");
  });

  it("serves a disallow-all robots.txt", async () => {
    const response = await proxy(request("/robots.txt", ADMIN));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Disallow: /");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("keeps next internals untouched", async () => {
    const response = await proxy(request("/_next/static/chunk.js", ADMIN));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });
});

describe("proxy — public host", () => {
  it("passes normal pages through", async () => {
    const response = await proxy(request("/services", ROOT));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("404s /admin on the public host", async () => {
    expect((await proxy(request("/admin", ROOT))).status).toBe(404);
    expect((await proxy(request("/admin/posts", ROOT))).status).toBe(404);
  });

  it("404s /api/admin on the public host", async () => {
    expect((await proxy(request("/api/admin/users", ROOT))).status).toBe(404);
  });

  it("does NOT add the admin noindex header to public pages", async () => {
    const response = await proxy(request("/", ROOT));
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });
});

describe("proxy — local development", () => {
  it("serves /admin on loopback so the panel is developable", async () => {
    const response = await proxy(request("/admin", "localhost:3000"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("serves nested admin routes on loopback", async () => {
    expect((await proxy(request("/admin/dashboard", "localhost:3000"))).status).toBe(200);
    expect((await proxy(request("/admin/login", "127.0.0.1:3000"))).status).toBe(200);
  });

  it("still 404s /admin on a real public domain", async () => {
    expect((await proxy(request("/admin", ROOT))).status).toBe(404);
  });
});

describe("proxy — IP blocking", () => {
  it("403s a blocked address on the public host", async () => {
    blockEntries = ["203.0.113.5"];
    const response = await proxy(request("/", ROOT, "203.0.113.5"));
    expect(response.status).toBe(403);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("403s a blocked address on the admin host too", async () => {
    blockEntries = ["203.0.113.0/24"];
    const response = await proxy(request("/login", ADMIN, "203.0.113.99"));
    expect(response.status).toBe(403);
  });

  it("lets an unblocked address through", async () => {
    blockEntries = ["203.0.113.5"];
    const response = await proxy(request("/", ROOT, "198.51.100.1"));
    expect(response.status).toBe(200);
  });

  it("does not block when the list is empty", async () => {
    const response = await proxy(request("/", ROOT, "203.0.113.5"));
    expect(response.status).toBe(200);
  });
});

describe("proxy — rate limiting", () => {
  it("429s once the public limit is exceeded, with Retry-After", async () => {
    const ip = "198.51.100.7";
    let last = await proxy(request("/", ROOT, ip));
    for (let i = 0; i < 130; i += 1) {
      last = await proxy(request("/", ROOT, ip));
    }
    expect(last.status).toBe(429);
    expect(Number(last.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("keeps counters separate per address", async () => {
    for (let i = 0; i < 130; i += 1) {
      await proxy(request("/", ROOT, "198.51.100.8"));
    }
    const other = await proxy(request("/", ROOT, "198.51.100.9"));
    expect(other.status).toBe(200);
  });

  it("skips the guards when there is no forwarding header", async () => {
    // Local dev has no proxy in front; nothing to key on.
    for (let i = 0; i < 200; i += 1) {
      const response = await proxy(request("/", ROOT));
      expect(response.status).toBe(200);
    }
  });
});
