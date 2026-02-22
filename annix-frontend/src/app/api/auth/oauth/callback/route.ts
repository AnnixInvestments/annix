import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const VOICE_FILTER_BACKEND_URL = process.env.VOICE_FILTER_BACKEND_URL || "http://localhost:47823";
const FRONTEND_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const OAUTH_CALLBACK_URL = `${FRONTEND_URL}/api/auth/oauth/callback`;

function parseState(state: string): { provider: string; mode: string; returnUrl: string } {
  const parts = state.split(":");
  if (parts.length < 3) {
    const provider = parts[0] || "";
    const returnUrl = parts[1] ? decodeURIComponent(parts[1]) : "/";
    return { provider, mode: "login", returnUrl };
  }
  const provider = parts[0];
  const mode = parts[1];
  const returnUrl = decodeURIComponent(parts.slice(2).join(":"));
  return { provider, mode, returnUrl };
}

async function handleOAuthCallback(
  provider: string,
  code: string,
  mode: string,
  returnUrl: string,
  existingToken?: string,
): Promise<NextResponse> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const effectiveMode = mode === "connect" && existingToken ? "connect" : "login";

    console.log("OAuth callback:", { mode, effectiveMode, hasToken: !!existingToken, provider });

    if (effectiveMode === "connect") {
      headers["Authorization"] = `Bearer ${existingToken}`;
    }

    const response = await fetch(`${VOICE_FILTER_BACKEND_URL}/api/oauth/exchange`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider,
        code,
        redirectUri: OAUTH_CALLBACK_URL,
        mode: effectiveMode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OAuth exchange failed:", errorData);
      return NextResponse.redirect(`${FRONTEND_URL}${returnUrl}?error=oauth_failed`);
    }

    const data = await response.json();
    const cookieStore = await cookies();

    if (data.token) {
      cookieStore.set("vf_token", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    return NextResponse.redirect(`${FRONTEND_URL}${returnUrl}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${FRONTEND_URL}${returnUrl}?error=oauth_failed`);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(`${FRONTEND_URL}/?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${FRONTEND_URL}/?error=missing_params`);
  }

  const { provider, mode, returnUrl } = parseState(state);
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("vf_token")?.value;

  return handleOAuthCallback(provider, code, mode, returnUrl, existingToken);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get("code") as string;
  const state = formData.get("state") as string;
  const error = formData.get("error") as string;

  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(`${FRONTEND_URL}/?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${FRONTEND_URL}/?error=missing_params`);
  }

  const { provider, mode, returnUrl } = parseState(state);
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("vf_token")?.value;

  return handleOAuthCallback(provider, code, mode, returnUrl, existingToken);
}
