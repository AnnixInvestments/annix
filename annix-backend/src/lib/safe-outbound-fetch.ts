import { lookup as dnsLookupCb } from "node:dns";
import { lookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import * as zlib from "node:zlib";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);
const DEFAULT_MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;

export class UnsafeOutboundUrlError extends Error {
  constructor(message = "Invalid URL") {
    super(message);
    this.name = "UnsafeOutboundUrlError";
  }
}

export interface SafeFetchResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
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

// The address actually used for the socket is validated here, at connect time —
// so a DNS-rebinding answer that differs from the pre-flight resolution cannot
// reach a private host (closes the validate-then-connect TOCTOU).
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookupCb(hostname, options, (err, address, family) => {
    if (err) {
      callback(err, address as string, family as number);
      return;
    }
    const single = typeof address === "string" ? address : "";
    if (!single || isBlockedIp(single)) {
      callback(new UnsafeOutboundUrlError(), "", 0);
      return;
    }
    callback(null, address as string, family as number);
  });
};

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }
  return Object.fromEntries(new Headers(headers).entries());
}

function decodedStream(response: http.IncomingMessage): NodeJS.ReadableStream {
  const encoding = String(response.headers["content-encoding"] ?? "").toLowerCase();
  if (encoding === "gzip") return response.pipe(zlib.createGunzip());
  if (encoding === "deflate") return response.pipe(zlib.createInflate());
  if (encoding === "br") return response.pipe(zlib.createBrotliDecompress());
  return response;
}

function guardedRequest(rawUrl: string, init: RequestInit): Promise<SafeFetchResponse> {
  return new Promise<SafeFetchResponse>((resolve, reject) => {
    const parsed = new URL(rawUrl);
    const transport = parsed.protocol === "https:" ? https : http;
    const request = transport.request(
      rawUrl,
      {
        method: init.method ?? "GET",
        // Default to identity so servers return uncompressed bodies (we don't
        // auto-negotiate gzip like global fetch did); the caller can override.
        headers: { "accept-encoding": "identity", ...headersToObject(init.headers ?? undefined) },
        signal: init.signal ?? undefined,
        lookup: guardedLookup,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const stream = decodedStream(response);
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            request.destroy();
            reject(new UnsafeOutboundUrlError("Response too large"));
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () => {
          const body = Buffer.concat(chunks);
          resolve({
            ok: status >= 200 && status < 300,
            status,
            headers: {
              get(name: string): string | null {
                const value = response.headers[name.toLowerCase()];
                if (Array.isArray(value)) return value[0] ?? null;
                return value ?? null;
              },
            },
            text: async () => body.toString("utf8"),
            arrayBuffer: async () =>
              body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
          });
        });
        stream.on("error", reject);
      },
    );
    request.on("error", reject);
    request.end();
  });
}

export async function safeFetch(
  url: string,
  init: RequestInit,
  maxRedirects: number = DEFAULT_MAX_REDIRECTS,
): Promise<SafeFetchResponse> {
  await assertSafeOutboundUrl(url);

  const response = await guardedRequest(url, init);

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
