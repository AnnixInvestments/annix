import { NextRequest, NextResponse } from "next/server";
import { log } from "@/app/lib/logger";

// Use 127.0.0.1 instead of localhost so Node 24's undici doesn't try IPv6
// (::1) first against an IPv4-only NestJS listener and get ECONNREFUSED.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.startsWith("/")
  ? `http://127.0.0.1:${(() => {
      const rawPORT = process.env.PORT;
      return rawPORT || "4000";
    })()}${process.env.NEXT_PUBLIC_API_URL}`
  : (() => {
      const rawNEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;
      return rawNEXT_PUBLIC_API_URL || "http://127.0.0.1:4001/api";
    })();

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
    ] as const;
    for (const field of FORWARDED_FIELDS) {
      const value = formData.get(field);
      if (value !== null && value !== undefined) {
        backendFormData.append(field, value as string);
      }
    }

    log.info("[API Route] Forwarding to backend:", `${BACKEND_URL}/nix/upload`);
    const response = await fetch(`${BACKEND_URL}/nix/upload`, {
      method: "POST",
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
