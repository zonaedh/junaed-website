import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function request(path: string, host: string) {
  return new NextRequest(new URL(`https://${host}${path}`), {
    headers: { host },
  });
}

const ROOT = "junaedhossain.com";
const ADMIN = "admin.junaedhossain.com";

describe("proxy — admin host", () => {
  it("adds the noindex header to admin responses", () => {
    const response = proxy(request("/", ADMIN));
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive, nosnippet",
    );
  });

  it("rewrites the admin root to /admin", () => {
    const response = proxy(request("/", ADMIN));
    const rewritten = response.headers.get("x-middleware-rewrite");
    expect(rewritten).toContain("/admin");
  });

  it("rewrites a bare admin path under /admin", () => {
    const response = proxy(request("/login", ADMIN));
    expect(response.headers.get("x-middleware-rewrite")).toContain("/admin/login");
  });

  it("does not double-prefix a path already under /admin", () => {
    const response = proxy(request("/admin/posts", ADMIN));
    const rewritten = response.headers.get("x-middleware-rewrite") ?? "";
    expect(rewritten).not.toContain("/admin/admin");
  });

  it("serves a disallow-all robots.txt", async () => {
    const response = proxy(request("/robots.txt", ADMIN));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Disallow: /");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("keeps next internals untouched", () => {
    const response = proxy(request("/_next/static/chunk.js", ADMIN));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });
});

describe("proxy — public host", () => {
  it("passes normal pages through", () => {
    const response = proxy(request("/services", ROOT));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("404s /admin on the public host", () => {
    expect(proxy(request("/admin", ROOT)).status).toBe(404);
    expect(proxy(request("/admin/posts", ROOT)).status).toBe(404);
  });

  it("404s /api/admin on the public host", () => {
    expect(proxy(request("/api/admin/users", ROOT)).status).toBe(404);
  });

  it("does NOT add the admin noindex header to public pages", () => {
    const response = proxy(request("/", ROOT));
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });
});
