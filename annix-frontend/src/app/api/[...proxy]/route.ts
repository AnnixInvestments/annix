import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const rawNEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;
const REMOTE_BACKEND = rawNEXT_PUBLIC_API_URL || "http://localhost:4001";

async function proxyRequest(request: NextRequest) {
  if (!REMOTE_BACKEND) {
    return NextResponse.json({ error: "Proxy not configured" }, { status: 502 });
  }

  const url = new URL(request.url);
  const targetUrl = `${REMOTE_BACKEND.replace(/\/api\/?$/, "")}${url.pathname}${url.search}`;

  const forwardHeaders: Record<string, string> = {
    "content-type": request.headers.get("content-type") || "application/json",
  };
  const auth = request.headers.get("authorization");
  if (auth) {
    forwardHeaders["authorization"] = auth;
  }
  const cookie = request.headers.get("cookie");
  if (cookie) {
    forwardHeaders["cookie"] = cookie;
  }
  const incomingHost = request.headers.get("host");
  if (incomingHost) {
    forwardHeaders["x-forwarded-host"] = incomingHost;
  }
  const incomingOrigin = request.headers.get("origin");
  if (incomingOrigin) {
    forwardHeaders["origin"] = incomingOrigin;
  }

  const body =
    request.method !== "GET" && request.method !== "HEAD" ? await request.arrayBuffer() : undefined;

  const attempt = async (): Promise<Response> =>
    fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
      redirect: "manual",
      cache: "no-store",
    });

  let response: Response;
  try {
    response = await attempt();
  } catch (firstErr) {
    const firstMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
    console.warn(`[proxy] fetch failed for ${targetUrl}: ${firstMsg} — retrying once`);
    try {
      response = await attempt();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[proxy] fetch failed (retry) for ${targetUrl}: ${msg}`);
      return NextResponse.json({ error: "Backend unreachable", detail: msg }, { status: 502 });
    }
  }

  if (response.status >= 500) {
    const text = await response
      .clone()
      .text()
      .catch(() => "");
    console.error(`[proxy] backend ${response.status} for ${targetUrl}: ${text.slice(0, 500)}`);
  }

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
