import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);
const DEFAULT_MAX_REDIRECTS = 5;

export class UnsafeOutboundUrlError extends Error {
  constructor(message = "Invalid URL") {
    super(message);
    this.name = "UnsafeOutboundUrlError";
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().split("%")[0];
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  const mappedDotted = normalized.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mappedDotted) return isPrivateIpv4(mappedDotted[1]);
  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1], 16);
    const low = Number.parseInt(mappedHex[2], 16);
    const ipv4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
    return isPrivateIpv4(ipv4);
  }
  if (normalized.startsWith("::ffff:")) return true;
  return false;
}

function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true;
}

async function resolveHostname(hostname: string): Promise<string[]> {
  try {
    const records = await lookup(hostname, { all: true });
    return records.map((record) => record.address);
  } catch {
    throw new UnsafeOutboundUrlError();
  }
}

export async function assertSafeOutboundUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeOutboundUrlError();
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new UnsafeOutboundUrlError();
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeOutboundUrlError();
  }

  if (isIP(hostname) !== 0) {
    if (isBlockedIp(hostname)) {
      throw new UnsafeOutboundUrlError();
    }
    return;
  }

  const resolved = await resolveHostname(hostname);
  if (resolved.length === 0 || resolved.some((address) => isBlockedIp(address))) {
    throw new UnsafeOutboundUrlError();
  }
}

export async function safeFetch(
  url: string,
  init: RequestInit,
  maxRedirects: number = DEFAULT_MAX_REDIRECTS,
): Promise<Response> {
  await assertSafeOutboundUrl(url);

  const response = await fetch(url, { ...init, redirect: "manual" });

  if (response.status >= 300 && response.status < 400) {
    if (maxRedirects <= 0) {
      throw new UnsafeOutboundUrlError("Too many redirects");
    }
    const location = response.headers.get("location");
    if (!location) {
      return response;
    }
    const nextUrl = new URL(location, url).href;
    return safeFetch(nextUrl, init, maxRedirects - 1);
  }

  return response;
}
