import { NextRequest, NextResponse } from "next/server";
import { ipv4LocalhostUrl } from "@/lib/api-config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const port = process.env.PORT;
// ipv4LocalhostUrl rewrites any "localhost" to "127.0.0.1" so undici
// doesn't IPv6-first against an IPv4-only NestJS listener — required
// because env-var values inline at compile-time and override our
// in-code fallback.
const BACKEND_URL = ipv4LocalhostUrl(
  apiUrl?.startsWith("/")
    ? `http://127.0.0.1:${port || "4000"}${apiUrl}`
    : apiUrl || "http://127.0.0.1:4001/api",
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string; size: string }> },
): Promise<NextResponse> {
  const { companyId, size } = await params;

  if (size !== "192" && size !== "512") {
    return NextResponse.json({ error: "Size must be 192 or 512" }, { status: 400 });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/stock-control/branding/${companyId}/icon/${size}`);

    if (!response.ok) {
      return NextResponse.json({ error: "Icon not available" }, { status: response.status });
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch icon";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
