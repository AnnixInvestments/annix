import { type NextRequest, NextResponse } from "next/server";

const REMOTE_BACKEND = process.env.NEXT_PUBLIC_API_URL;

function isRemoteProxy(): boolean {
  return !!REMOTE_BACKEND && REMOTE_BACKEND.startsWith("http");
}

async function proxyRequest(request: NextRequest) {
  if (!isRemoteProxy() || !REMOTE_BACKEND) {
    return NextResponse.json({ error: "Proxy not configured" }, { status: 502 });
  }

  const url = new URL(request.url);
  const targetUrl = `${REMOTE_BACKEND.replace(/\/api\/?$/, "")}${url.pathname}${url.search}`;

  const targetParsed = new URL(targetUrl);
  const forwardHeaders: Record<string, string> = {
    "content-type": request.headers.get("content-type") || "application/json",
    host: targetParsed.host,
  };
  const auth = request.headers.get("authorization");
  if (auth) {
    forwardHeaders["authorization"] = auth;
  }

  const body =
    request.method !== "GET" && request.method !== "HEAD" ? await request.arrayBuffer() : undefined;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: forwardHeaders,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}
