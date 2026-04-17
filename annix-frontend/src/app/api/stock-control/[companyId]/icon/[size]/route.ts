import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const port = process.env.PORT;
const BACKEND_URL = apiUrl?.startsWith("/")
  ? `http://localhost:${port || "4000"}${apiUrl}`
  : apiUrl || "http://localhost:4001/api";

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
