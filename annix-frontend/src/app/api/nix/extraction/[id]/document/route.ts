import { NextRequest, NextResponse } from "next/server";
import { log } from "@/app/lib/logger";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.startsWith("/")
  ? `http://localhost:${(() => {
      const rawPORT = process.env.PORT;
      return rawPORT || "4000";
    })()}${process.env.NEXT_PUBLIC_API_URL}`
  : (() => {
      const rawNEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;
      return rawNEXT_PUBLIC_API_URL || "http://localhost:4001/api";
    })();

/**
 * Streams the source PDF / docx / image of a Nix extraction through the
 * Next.js server back to the browser. Exists to bypass S3 CORS — react-pdf
 * (PDF.js) fetches files directly via the browser fetch API, and S3 presigned
 * URLs aren't always served with the right CORS headers for that. The iframe
 * preview doesn't need this route because iframes load cross-origin without
 * triggering CORS preflight.
 *
 * Auth is bounced through to the backend's existing /nix/extraction/:id/
 * document-url endpoint (which gates the presigned URL) so this proxy adds
 * no new authorisation surface — every request still passes through the
 * AnyUserAuthGuard.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const extractionId = params.id;
  if (!extractionId || !/^\d+$/.test(extractionId)) {
    return NextResponse.json({ error: "Invalid extraction id" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    // 1. Ask the backend for a presigned URL.
    const urlResponse = await fetch(`${BACKEND_URL}/nix/extraction/${extractionId}/document-url`, {
      method: "GET",
      headers: { Authorization: authHeader },
    });
    if (!urlResponse.ok) {
      const errorText = await urlResponse.text();
      log.warn("[nix proxy] document-url returned not-ok:", urlResponse.status, errorText);
      return NextResponse.json(
        { error: errorText || `document-url returned ${urlResponse.status}` },
        { status: urlResponse.status },
      );
    }
    const { url } = (await urlResponse.json()) as { url: string | null };
    if (!url) {
      return NextResponse.json(
        { error: "No source document on file for this extraction" },
        { status: 404 },
      );
    }

    // 2. Fetch the file server-side (no CORS in Node) and buffer the bytes.
    // Buffering instead of streaming because Next.js App Router's
    // ReadableStream forwarding has been flaky on Windows + Node 22 dev
    // server — the buffered approach is reliable for the PDFs we deal with
    // here (almost all under 5 MB).
    let fileResponse: Response;
    try {
      fileResponse = await fetch(url);
    } catch (fetchErr) {
      const cause = fetchErr instanceof Error ? fetchErr : new Error("unknown fetch failure");
      const detail =
        cause.message + (cause.cause ? ` (cause: ${JSON.stringify(cause.cause)})` : "");
      log.error("[nix proxy] S3 fetch threw:", detail, "url:", url.slice(0, 120));
      return NextResponse.json({ error: `Could not reach storage: ${detail}` }, { status: 502 });
    }
    if (!fileResponse.ok) {
      const errorBody = await fileResponse.text().catch(() => "");
      log.error("[nix proxy] S3 returned not-ok:", fileResponse.status, errorBody.slice(0, 200));
      return NextResponse.json(
        { error: `S3 fetch failed: ${fileResponse.status}` },
        { status: fileResponse.status },
      );
    }
    const contentType = fileResponse.headers.get("content-type") ?? "application/pdf";
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    const cause = err instanceof Error ? err : new Error("unknown");
    const detail = cause.message + (cause.cause ? ` (cause: ${JSON.stringify(cause.cause)})` : "");
    log.error("[nix proxy] failed:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
