import { NextRequest, NextResponse } from "next/server";

const FRONTEND_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const OAUTH_CALLBACK_URL = `${FRONTEND_URL}/api/auth/oauth/callback`;

interface OAuthConfig {
  clientId: string;
  authUrl: string;
  scopes: string[];
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["email", "profile", "https://www.googleapis.com/auth/calendar.readonly"],
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scopes: ["openid", "email", "profile", "User.Read", "Calendars.Read", "offline_access"],
  },
  zoom: {
    clientId: process.env.ZOOM_CLIENT_ID ?? "",
    authUrl: "https://zoom.us/oauth/authorize",
    scopes: ["user:read:user"],
  },
};

const APPLE_CONFIG = {
  clientId: process.env.APPLE_CLIENT_ID ?? "",
  authUrl: "https://appleid.apple.com/auth/authorize",
  scopes: ["name", "email"],
};

function buildOAuthUrl(provider: string, returnUrl: string, mode: string): string | null {
  const config = OAUTH_CONFIGS[provider];
  if (!config?.clientId) {
    return null;
  }

  const state = `${provider}:${mode}:${encodeURIComponent(returnUrl)}`;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: OAUTH_CALLBACK_URL,
    response_type: "code",
    scope: config.scopes.join(" "),
    state: state,
  });

  return `${config.authUrl}?${params.toString()}`;
}

function buildAppleAuthUrl(returnUrl: string, mode: string): string | null {
  if (!APPLE_CONFIG.clientId) {
    return null;
  }

  const state = `apple:${mode}:${encodeURIComponent(returnUrl)}`;
  const params = new URLSearchParams({
    client_id: APPLE_CONFIG.clientId,
    redirect_uri: OAUTH_CALLBACK_URL,
    response_type: "code",
    scope: APPLE_CONFIG.scopes.join(" "),
    state: state,
    response_mode: "form_post",
  });

  return `${APPLE_CONFIG.authUrl}?${params.toString()}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const searchParams = request.nextUrl.searchParams;
  const returnUrl = searchParams.get("returnUrl") || "/";
  const mode = searchParams.get("mode") || "login";

  if (provider === "apple") {
    if (!APPLE_CONFIG.clientId) {
      return NextResponse.json({ error: "Apple OAuth is not configured" }, { status: 503 });
    }
    const authUrl = buildAppleAuthUrl(returnUrl, mode);
    if (authUrl) {
      return NextResponse.redirect(authUrl);
    }
    return NextResponse.json({ error: "Failed to generate Apple OAuth URL" }, { status: 500 });
  }

  const configKey = provider === "teams" ? "microsoft" : provider;
  if (["google", "microsoft", "zoom"].includes(configKey)) {
    const config = OAUTH_CONFIGS[configKey];
    if (!config?.clientId) {
      return NextResponse.json({ error: `${provider} OAuth is not configured` }, { status: 503 });
    }

    const authUrl = buildOAuthUrl(configKey, returnUrl, mode);
    if (authUrl) {
      return NextResponse.redirect(authUrl);
    }
    return NextResponse.json({ error: "Failed to generate OAuth URL" }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid OAuth provider" }, { status: 400 });
}
