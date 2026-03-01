import { NextRequest, NextResponse } from "next/server";
import { log } from "@/app/lib/logger";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.startsWith("/")
  ? `http://localhost:${process.env.PORT || "4000"}${process.env.NEXT_PUBLIC_API_URL}`
  : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";

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

    log.info("[API Route] Forwarding to backend:", `${BACKEND_URL}/nix/upload`);
    const response = await fetch(`${BACKEND_URL}/nix/upload`, {
      method: "POST",
      body: formData,
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
