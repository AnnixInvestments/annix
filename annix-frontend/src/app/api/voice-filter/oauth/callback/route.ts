import { NextRequest, NextResponse } from "next/server";

const VOICE_FILTER_BACKEND_URL = process.env.VOICE_FILTER_BACKEND_URL || "http://localhost:47823";
const FRONTEND_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/voice-filter/login?error=${encodeURIComponent(error)}`, FRONTEND_URL),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/voice-filter/login?error=missing_code", FRONTEND_URL));
  }

  const [provider] = state.split(":");
  if (!["google", "microsoft", "teams", "zoom"].includes(provider)) {
    return NextResponse.redirect(
      new URL("/voice-filter/login?error=invalid_provider", FRONTEND_URL),
    );
  }

  try {
    const exchangeResponse = await fetch(`${VOICE_FILTER_BACKEND_URL}/api/oauth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: provider === "teams" ? "microsoft" : provider,
        code,
        redirectUri: `${FRONTEND_URL}/api/voice-filter/oauth/callback`,
      }),
    });

    if (!exchangeResponse.ok) {
      const errorData = await exchangeResponse.json().catch(() => ({}));
      console.error("OAuth exchange failed:", errorData);
      return NextResponse.redirect(new URL("/voice-filter/login?error=oauth_failed", FRONTEND_URL));
    }

    const result = (await exchangeResponse.json()) as { token: string };
    const token = result.token;

    const response = NextResponse.redirect(new URL("/voice-filter", FRONTEND_URL));

    response.cookies.set("vf_token", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 604800,
    });

    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/voice-filter/login?error=oauth_error", FRONTEND_URL));
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get("code") as string | null;
  const state = formData.get("state") as string | null;
  const error = formData.get("error") as string | null;

  if (error) {
    return NextResponse.redirect(
      new URL(`/voice-filter/login?error=${encodeURIComponent(error)}`, FRONTEND_URL),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/voice-filter/login?error=missing_code", FRONTEND_URL));
  }

  const [provider] = state.split(":");
  if (provider !== "apple") {
    return NextResponse.redirect(
      new URL("/voice-filter/login?error=invalid_provider", FRONTEND_URL),
    );
  }

  try {
    const exchangeResponse = await fetch(`${VOICE_FILTER_BACKEND_URL}/api/oauth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "apple",
        code,
        redirectUri: `${FRONTEND_URL}/api/voice-filter/oauth/callback`,
      }),
    });

    if (!exchangeResponse.ok) {
      const errorData = await exchangeResponse.json().catch(() => ({}));
      console.error("Apple OAuth exchange failed:", errorData);
      return NextResponse.redirect(new URL("/voice-filter/login?error=oauth_failed", FRONTEND_URL));
    }

    const result = (await exchangeResponse.json()) as { token: string };
    const token = result.token;

    const response = NextResponse.redirect(new URL("/voice-filter", FRONTEND_URL));

    response.cookies.set("vf_token", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 604800,
    });

    return response;
  } catch (err) {
    console.error("Apple OAuth callback error:", err);
    return NextResponse.redirect(new URL("/voice-filter/login?error=oauth_error", FRONTEND_URL));
  }
}
