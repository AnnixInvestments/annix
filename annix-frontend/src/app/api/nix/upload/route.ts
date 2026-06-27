import { NextRequest, NextResponse } from "next/server";
import { log } from "@/app/lib/logger";
import { ipv4LocalhostUrl } from "@/lib/api-config";

// Server-side fetch from a Next.js API route to NestJS. Using "localhost"
// here trips Node 24's undici, which tries ::1 first and gets
// ECONNREFUSED against an IPv4-only listener. ipv4LocalhostUrl rewrites
// any "localhost" to "127.0.0.1" so the resolution race never happens
// regardless of what NEXT_PUBLIC_API_URL holds (env vars override our
// in-code fallback at compile time).
const BACKEND_URL = ipv4LocalhostUrl(
  process.env.NEXT_PUBLIC_API_URL?.startsWith("/")
    ? `http://127.0.0.1:${(() => {
        const rawPORT = process.env.PORT;
        return rawPORT || "4000";
      })()}${process.env.NEXT_PUBLIC_API_URL}`
    : (() => {
        const rawNEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;
        return rawNEXT_PUBLIC_API_URL || "http://127.0.0.1:4001/api";
      })(),
);

export async function POST(request: NextRequest) {
  log.info("[API Route] Nix upload starting, backend URL:", BACKEND_URL);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    log.info(
      "[API Route] Received file:",
      file ? (file as File).name : "no file",
      "Size:",
      file ? (file as File).size : 0,
    );

    const backendFormData = new FormData();
    if (file) backendFormData.append("file", file);
    // Forward every multipart field the backend's /nix/upload accepts.
    // Adding a new field on the backend means appending it here too —
    // unforwarded fields are silently dropped by this proxy.
    const FORWARDED_FIELDS = [
      "userId",
      "rfqId",
      "sourceModule",
      "sourceId",
      "extractionProfile",
      "documentRole",
      "sessionId",
      "productTypes",
      "skipExtraction",
    ] as const;
    for (const field of FORWARDED_FIELDS) {
      const value = formData.get(field);
      if (value !== null && value !== undefined) {
        backendFormData.append(field, value as string);
      }
    }

    // Forward the caller's bearer token so the backend's OptionalAnyUserAuthGuard
    // recognises authenticated portal users — they must stay exempt from the
    // anonymous-only cost caps + IP throttle. Anonymous callers simply have no
    // header and fall through to the (capped, throttled) anonymous path.
    const incomingAuth = request.headers.get("authorization");
    const forwardHeaders: Record<string, string> = incomingAuth
      ? { authorization: incomingAuth }
      : {};

    log.info("[API Route] Forwarding to backend:", `${BACKEND_URL}/nix/upload`);
    const response = await fetch(`${BACKEND_URL}/nix/upload`, {
      method: "POST",
      headers: forwardHeaders,
      body: backendFormData,
    });

    log.info("[API Route] Backend response status:", response.status);
    const data = await response.json();
    log.debug("[API Route] Backend response data:", JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    log.error("[API Route] Nix upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Upload failed";
    const errorStack = error instanceof Error ? error.stack : undefined;
    log.error("[API Route] Error details:", { message: errorMessage, stack: errorStack });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
