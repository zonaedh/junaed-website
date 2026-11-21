/**
 * IP and CIDR matching â€” pure logic, no I/O.
 *
 * MVP.md Â§8.2. The block list stores single addresses and CIDR ranges; this
 * module decides whether a given address falls inside one.
 *
 * Why hand-rolled rather than a dependency: the whole job is parsing four
 * numbers, and a wrong answer here either blocks real visitors or lets an
 * attacker through. Both failure modes are worth owning a tested 120 lines for.
 *
 * Supports IPv4 and IPv6. IPv4-mapped IPv6 addresses (`::ffff:1.2.3.4`) are
 * normalised to their IPv4 form first, because a proxy in front of the app may
 * report either shape for the same client.
 */

export type ParsedAddress = {
  version: 4 | 6;
  /** 32-bit (v4) or 128-bit (v6) value as a bigint. */
  value: bigint;
};

/**
 * BigInt constants instead of literals.
 *
 * `tsconfig` targets ES2017, and TypeScript rejects `0n` literals below ES2020
 * even though the `esnext` lib provides the `BigInt` type. These constants keep
 * the arithmetic readable without changing the project's emit target for one
 * module.
 */
const BIG_ZERO = BigInt(0);
const BIG_EIGHT = BigInt(8);
const BIG_SIXTEEN = BigInt(16);
const BIG_FFFF = BigInt(0xffff);

/** Parse a dotted-quad IPv4 address. Returns null when malformed. */
function parseIpv4(input: string): bigint | null {
  const parts = input.split(".");
  if (parts.length !== 4) return null;

  let value = BIG_ZERO;
  for (const part of parts) {
    // Reject empty, non-numeric, and leading-zero forms like "01" which some
    // parsers read as octal. Only 0-255, no sign, no whitespace.
    if (!/^\d{1,3}$/.test(part)) return null;
    if (part.length > 1 && part.startsWith("0")) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value << BIG_EIGHT) | BigInt(octet);
  }
  return value;
}

/** Expand an IPv6 address (including `::` shorthand) to a 128-bit value. */
function parseIpv6(input: string): bigint | null {
  // Strip a zone index (`fe80::1%eth0`) â€” it is not part of the address.
  const address = input.split("%")[0] ?? "";
  if (address === "") return null;

  // A single `::` is allowed; more than one is malformed.
  const doubleColons = address.split("::").length - 1;
  if (doubleColons > 1) return null;

  const [headPart, tailPart] = address.split("::");
  const head = headPart ? headPart.split(":") : [];
  const tail = tailPart ? tailPart.split(":") : [];

  // An embedded IPv4 tail (`::ffff:192.168.0.1`) counts as two groups.
  const expand = (groups: string[]): string[] | null => {
    const out: string[] = [];
    for (const group of groups) {
      if (group.includes(".")) {
        const v4 = parseIpv4(group);
        if (v4 === null) return null;
        out.push(((v4 >> BIG_SIXTEEN) & BIG_FFFF).toString(16));
        out.push((v4 & BIG_FFFF).toString(16));
      } else {
        if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
        out.push(group);
      }
    }
    return out;
  };

  const headGroups = expand(head);
  const tailGroups = expand(tail);
  if (!headGroups || !tailGroups) return null;

  let groups: string[];
  if (doubleColons === 1) {
    const missing = 8 - (headGroups.length + tailGroups.length);
    if (missing < 0) return null;
    groups = [...headGroups, ...Array<string>(missing).fill("0"), ...tailGroups];
  } else {
    if (headGroups.length !== 8) return null;
    groups = headGroups;
  }

  let value = BIG_ZERO;
  for (const group of groups) {
    value = (value << BIG_SIXTEEN) | BigInt(parseInt(group, 16));
  }
  return value;
}

/**
 * Parse an address into its numeric form.
 *
 * IPv4-mapped IPv6 (`::ffff:a.b.c.d`) is unwrapped to IPv4 so the same client
 * matches the same rules whichever form the proxy reports.
 */
export function parseAddress(input: string | null | undefined): ParsedAddress | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // IPv4-mapped IPv6: ::ffff:1.2.3.4
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
  if (mapped) {
    const v4 = parseIpv4(mapped[1] ?? "");
    return v4 === null ? null : { version: 4, value: v4 };
  }

  if (trimmed.includes(":")) {
    const v6 = parseIpv6(trimmed);
    return v6 === null ? null : { version: 6, value: v6 };
  }

  const v4 = parseIpv4(trimmed);
  return v4 === null ? null : { version: 4, value: v4 };
}

/** True when the string is a syntactically valid IPv4 or IPv6 address. */
export function isValidIp(input: string | null | undefined): boolean {
  return parseAddress(input) !== null;
}

/**
 * Validate a block-list entry: a single address or a CIDR range.
 *
 * Returns the normalised form, or null when the entry is unusable. Rejecting
 * bad input here is what stops a typo from silently protecting nothing.
 */
export function normaliseBlockEntry(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  if (!trimmed.includes("/")) {
    const parsed = parseAddress(trimmed);
    return parsed === null ? null : trimmed;
  }

  const [addressPart, prefixPart, ...rest] = trimmed.split("/");
  if (rest.length > 0 || !addressPart || !prefixPart) return null;
  if (!/^\d{1,3}$/.test(prefixPart)) return null;

  const parsed = parseAddress(addressPart);
  if (!parsed) return null;

  const prefix = Number(prefixPart);
  const maxPrefix = parsed.version === 4 ? 32 : 128;
  if (prefix < 0 || prefix > maxPrefix) return null;

  return `${addressPart}/${prefix}`;
}

/**
 * Does this address fall inside this entry?
 *
 * An entry without a slash is an exact match. With a slash, the first `prefix`
 * bits must agree.
 */
export function addressMatchesEntry(
  address: ParsedAddress,
  entry: string,
): boolean {
  const normalised = normaliseBlockEntry(entry);
  if (!normalised) return false;

  if (!normalised.includes("/")) {
    const target = parseAddress(normalised);
    return target !== null && target.version === address.version && target.value === address.value;
  }

  const [addressPart, prefixPart] = normalised.split("/");
  const target = parseAddress(addressPart ?? "");
  if (!target || target.version !== address.version) return false;

  const prefix = Number(prefixPart);
  const totalBits = address.version === 4 ? 32 : 128;
  if (prefix === 0) return true; // 0.0.0.0/0 matches everything of its family

  const shift = BigInt(totalBits - prefix);
  return address.value >> shift === target.value >> shift;
}

/**
 * True when the address matches any entry in the list.
 *
 * The list is expected to be small (a manual block list, not a threat feed),
 * so a linear scan is correct and simpler than a trie.
 */
export function isAddressBlocked(
  address: string | null | undefined,
  entries: readonly string[],
): boolean {
  const parsed = parseAddress(address);
  if (!parsed) return false;
  return entries.some((entry) => addressMatchesEntry(parsed, entry));
}

/**
 * Extract the client address from forwarding headers.
 *
 * Order matters: the left-most `x-forwarded-for` entry is the original client,
 * but only when the app sits behind a proxy that appends. Locally there is no
 * proxy, so the headers are absent and this returns null.
 */
export function clientAddressFromHeaders(headers: {
  get(name: string): string | null;
}): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && isValidIp(first)) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && isValidIp(realIp.trim())) return realIp.trim();

  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && isValidIp(cfIp.trim())) return cfIp.trim();

  return null;
}
