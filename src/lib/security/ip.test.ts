import { describe, expect, it } from "vitest";
import {
  addressMatchesEntry,
  clientAddressFromHeaders,
  isAddressBlocked,
  isValidIp,
  normaliseBlockEntry,
  parseAddress,
} from "./ip";

/**
 * IP matching tests (MVP.md Â§8.2).
 *
 * The cases that matter are the ones where a plausible implementation is
 * quietly wrong: leading-zero octets, a CIDR that is off by one bit, an
 * IPv4-mapped address that fails to match its own IPv4 rule, and an IPv6
 * prefix that compares the wrong end of the address.
 */

describe("parseAddress", () => {
  it("parses a plain IPv4 address", () => {
    expect(parseAddress("192.168.1.1")).toEqual({ version: 4, value: BigInt(3232235777) });
  });

  it("parses 0.0.0.0 and 255.255.255.255", () => {
    expect(parseAddress("0.0.0.0")?.value).toBe(BigInt(0));
    expect(parseAddress("255.255.255.255")?.value).toBe(BigInt(4294967295));
  });

  it("rejects an octet above 255", () => {
    expect(parseAddress("192.168.1.256")).toBeNull();
  });

  it("rejects leading-zero octets", () => {
    // "010" is octal in some parsers; refusing it avoids an ambiguity attack.
    expect(parseAddress("192.168.01.1")).toBeNull();
  });

  it("rejects a three-part address", () => {
    expect(parseAddress("192.168.1")).toBeNull();
  });

  it("rejects non-numeric and empty input", () => {
    expect(parseAddress("not-an-ip")).toBeNull();
    expect(parseAddress("")).toBeNull();
    expect(parseAddress(null)).toBeNull();
  });

  it("parses full IPv6", () => {
    expect(parseAddress("2001:0db8:0000:0000:0000:0000:0000:0001")?.version).toBe(6);
  });

  it("expands the :: shorthand", () => {
    const short = parseAddress("2001:db8::1");
    const long = parseAddress("2001:0db8:0000:0000:0000:0000:0000:0001");
    expect(short?.value).toBe(long?.value);
  });

  it("parses the loopback ::1", () => {
    expect(parseAddress("::1")?.value).toBe(BigInt(1));
  });

  it("rejects two :: groups", () => {
    expect(parseAddress("2001::db8::1")).toBeNull();
  });

  it("unwraps an IPv4-mapped IPv6 address to IPv4", () => {
    expect(parseAddress("::ffff:192.168.1.1")).toEqual({
      version: 4,
      value: BigInt(3232235777),
    });
  });

  it("strips a zone index", () => {
    expect(parseAddress("fe80::1%eth0")?.version).toBe(6);
  });
});

describe("isValidIp", () => {
  it("accepts valid addresses of both families", () => {
    expect(isValidIp("10.0.0.1")).toBe(true);
    expect(isValidIp("::1")).toBe(true);
  });

  it("rejects junk", () => {
    expect(isValidIp("10.0.0")).toBe(false);
    expect(isValidIp("hello")).toBe(false);
  });
});

describe("normaliseBlockEntry", () => {
  it("keeps a plain address", () => {
    expect(normaliseBlockEntry("203.0.113.5")).toBe("203.0.113.5");
  });

  it("keeps a valid CIDR", () => {
    expect(normaliseBlockEntry("203.0.113.0/24")).toBe("203.0.113.0/24");
  });

  it("trims surrounding whitespace", () => {
    expect(normaliseBlockEntry("  203.0.113.5  ")).toBe("203.0.113.5");
  });

  it("rejects a prefix beyond the address width", () => {
    expect(normaliseBlockEntry("203.0.113.0/33")).toBeNull();
    expect(normaliseBlockEntry("2001:db8::/129")).toBeNull();
  });

  it("rejects a malformed address inside a CIDR", () => {
    expect(normaliseBlockEntry("999.0.0.0/24")).toBeNull();
  });

  it("rejects a non-numeric prefix", () => {
    expect(normaliseBlockEntry("203.0.113.0/abc")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(normaliseBlockEntry("   ")).toBeNull();
  });
});

describe("addressMatchesEntry", () => {
  const v4 = (ip: string) => parseAddress(ip)!;

  it("matches an exact address", () => {
    expect(addressMatchesEntry(v4("203.0.113.5"), "203.0.113.5")).toBe(true);
  });

  it("does not match a different exact address", () => {
    expect(addressMatchesEntry(v4("203.0.113.6"), "203.0.113.5")).toBe(false);
  });

  it("matches inside a /24", () => {
    expect(addressMatchesEntry(v4("203.0.113.200"), "203.0.113.0/24")).toBe(true);
  });

  it("does not match just outside a /24", () => {
    expect(addressMatchesEntry(v4("203.0.114.1"), "203.0.113.0/24")).toBe(false);
  });

  it("handles a /32 as an exact match", () => {
    expect(addressMatchesEntry(v4("203.0.113.5"), "203.0.113.5/32")).toBe(true);
    expect(addressMatchesEntry(v4("203.0.113.6"), "203.0.113.5/32")).toBe(false);
  });

  it("handles a /0 matching everything of its family", () => {
    expect(addressMatchesEntry(v4("8.8.8.8"), "0.0.0.0/0")).toBe(true);
  });

  it("matches an IPv6 prefix", () => {
    expect(addressMatchesEntry(parseAddress("2001:db8:abcd::1")!, "2001:db8::/32")).toBe(true);
    expect(addressMatchesEntry(parseAddress("2001:db9::1")!, "2001:db8::/32")).toBe(false);
  });

  it("never matches across address families", () => {
    expect(addressMatchesEntry(v4("203.0.113.5"), "2001:db8::/32")).toBe(false);
    expect(addressMatchesEntry(parseAddress("::1")!, "127.0.0.1")).toBe(false);
  });

  it("matches an IPv4-mapped client against an IPv4 rule", () => {
    // The proxy may report either shape for the same client.
    expect(addressMatchesEntry(parseAddress("::ffff:203.0.113.5")!, "203.0.113.0/24")).toBe(true);
  });
});

describe("isAddressBlocked", () => {
  it("returns false for an empty list", () => {
    expect(isAddressBlocked("203.0.113.5", [])).toBe(false);
  });

  it("finds a match anywhere in the list", () => {
    expect(isAddressBlocked("203.0.113.5", ["10.0.0.1", "203.0.113.0/24"])).toBe(true);
  });

  it("ignores unusable entries instead of throwing", () => {
    expect(isAddressBlocked("203.0.113.5", ["garbage", "203.0.113.5"])).toBe(true);
  });

  it("returns false for a missing address", () => {
    expect(isAddressBlocked(null, ["203.0.113.5"])).toBe(false);
  });
});

describe("clientAddressFromHeaders", () => {
  const headers = (map: Record<string, string>) => ({
    get: (name: string) => map[name.toLowerCase()] ?? null,
  });

  it("takes the first x-forwarded-for entry", () => {
    expect(
      clientAddressFromHeaders(headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })),
    ).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    expect(clientAddressFromHeaders(headers({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to cf-connecting-ip", () => {
    expect(clientAddressFromHeaders(headers({ "cf-connecting-ip": "203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });

  it("ignores an invalid forwarded value", () => {
    expect(
      clientAddressFromHeaders(headers({ "x-forwarded-for": "not-an-ip, 10.0.0.1" })),
    ).toBeNull();
  });

  it("returns null when there are no forwarding headers", () => {
    expect(clientAddressFromHeaders(headers({}))).toBeNull();
  });
});
