import { NextRequest, NextResponse } from "next/server";

const rawVOICE_FILTER_BACKEND_URLValue = process.env.VOICE_FILTER_BACKEND_URL;
const VOICE_FILTER_BACKEND_URL = rawVOICE_FILTER_BACKEND_URLValue || "http://localhost:47823";
const rawNEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const FRONTEND_URL = rawNEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const OAUTH_REDIRECT_URI = `${FRONTEND_URL}/api/voice-filter/oauth/callback`;

interface OAuthConfig {
  clientId: string;
  authUrl: string;
  scopes: string[];
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  google: {
    clientId: (() => {
      const rawGOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
      return rawGOOGLE_CLIENT_ID ?? "";
    })(),
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["email", "profile", "https://www.googleapis.com/auth/calendar.readonly"],
  },
  microsoft: {
    clientId: (() => {
      const rawMICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
      return rawMICROSOFT_CLIENT_ID ?? "";
    })(),
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scopes: ["openid", "email", "profile", "User.Read", "Calendars.Read", "offline_access"],
  },
  zoom: {
    clientId: (() => {
      const rawZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
      return rawZOOM_CLIENT_ID ?? "";
    })(),
    authUrl: "https://zoom.us/oauth/authorize",
    scopes: ["user:read"],
  },
};

const APPLE_CONFIG = {
  clientId: (() => {
    const rawAPPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
    return rawAPPLE_CLIENT_ID ?? "";
  })(),
  authUrl: "https://appleid.apple.com/auth/authorize",
  scopes: ["name", "email"],
};

function oauthAuthUrl(configKey: string, state: string): string | null {
  const config = OAUTH_CONFIGS[configKey];
  if (!config?.clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: config.scopes.join(" "),
    state: state,
  });

  return `${config.authUrl}?${params.toString()}`;
}

function appleAuthUrl(state: string): string | null {
  if (!APPLE_CONFIG.clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: APPLE_CONFIG.clientId,
    redirect_uri: OAUTH_REDIRECT_URI,
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

  if (provider === "apple") {
    if (!APPLE_CONFIG.clientId) {
      return NextResponse.json({ error: "Apple OAuth is not configured" }, { status: 503 });
    }
    const state = crypto.randomUUID();
    const authUrl = appleAuthUrl(`apple:${state}`);
    if (authUrl) {
      return NextResponse.redirect(authUrl);
    }
    return NextResponse.json({ error: "Failed to generate Apple OAuth URL" }, { status: 500 });
  }

  if (["google", "microsoft", "teams", "zoom"].includes(provider)) {
    const configKey = provider === "teams" ? "microsoft" : provider;
    const config = OAUTH_CONFIGS[configKey];

    if (!config?.clientId) {
      return NextResponse.json({ error: `${provider} OAuth is not configured` }, { status: 503 });
    }

    const state = crypto.randomUUID();
    const authUrl = oauthAuthUrl(configKey, `${provider}:${state}`);
    if (authUrl) {
      return NextResponse.redirect(authUrl);
    }
    return NextResponse.json({ error: "Failed to generate OAuth URL" }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid OAuth provider" }, { status: 400 });
}
