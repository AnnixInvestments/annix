import { createSign } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";
const JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";
// Refresh a little before the 1h token actually expires to avoid edge races.
const TOKEN_TTL_SECONDS = 3600;
const TOKEN_SKEW_SECONDS = 60;

type NotificationType = "URL_UPDATED" | "URL_DELETED";

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

export interface IndexingPingResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Minimal, dependency-free client for the Google Indexing API. Signs a
 * service-account JWT with node:crypto, exchanges it for an access token
 * (cached in-memory until just before expiry), then pings
 * urlNotifications:publish. When GOOGLE_INDEXING_CREDENTIALS is not configured
 * it degrades to a logged no-op so dev/test/self-hosted runs never break.
 *
 * Credentials must be a Fly secret (never fly.toml): the JSON of a service
 * account that is an owner of the verified Search Console property.
 */
@Injectable()
export class GoogleIndexingClient {
  private readonly logger = new Logger(GoogleIndexingClient.name);
  private readonly credentials: ServiceAccountCredentials | null;
  private cachedToken: { token: string; expiresAt: number } | null = null;
  private loggedDisabled = false;

  constructor(configService: ConfigService) {
    this.credentials = this.parseCredentials(
      configService.get<string>("GOOGLE_INDEXING_CREDENTIALS"),
    );
  }

  get isConfigured(): boolean {
    return this.credentials !== null;
  }

  notifyUpdated(url: string): Promise<IndexingPingResult> {
    return this.notify(url, "URL_UPDATED");
  }

  notifyDeleted(url: string): Promise<IndexingPingResult> {
    return this.notify(url, "URL_DELETED");
  }

  private async notify(url: string, type: NotificationType): Promise<IndexingPingResult> {
    if (!this.credentials) {
      if (!this.loggedDisabled) {
        this.logger.log(
          "GOOGLE_INDEXING_CREDENTIALS not set — Indexing API pings are disabled (no-op).",
        );
        this.loggedDisabled = true;
      }
      return { ok: false, skipped: true };
    }

    try {
      const token = await this.accessToken();
      const response = await fetch(INDEXING_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, type }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        this.logger.warn(`Indexing ${type} for ${url} failed: ${response.status} ${detail}`);
        return { ok: false, error: `${response.status}` };
      }
      this.logger.log(`Indexing ${type} pinged for ${url}.`);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Indexing ${type} for ${url} threw: ${message}`);
      return { ok: false, error: message };
    }
  }

  private async accessToken(): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.cachedToken.expiresAt - TOKEN_SKEW_SECONDS > nowSeconds) {
      return this.cachedToken.token;
    }
    const creds = this.credentials as ServiceAccountCredentials;
    const assertion = this.signJwt(creds, nowSeconds);

    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: JWT_BEARER_GRANT, assertion }).toString(),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`token exchange failed: ${response.status} ${detail}`);
    }
    const json = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) throw new Error("token exchange returned no access_token");
    this.cachedToken = {
      token: json.access_token,
      expiresAt: nowSeconds + (json.expires_in ?? TOKEN_TTL_SECONDS),
    };
    return json.access_token;
  }

  private signJwt(creds: ServiceAccountCredentials, nowSeconds: number): string {
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = base64Url(
      JSON.stringify({
        iss: creds.client_email,
        scope: INDEXING_SCOPE,
        aud: TOKEN_ENDPOINT,
        iat: nowSeconds,
        exp: nowSeconds + TOKEN_TTL_SECONDS,
      }),
    );
    const signingInput = `${header}.${claim}`;
    const signature = createSign("RSA-SHA256")
      .update(signingInput)
      .sign(creds.private_key)
      .toString("base64url");
    return `${signingInput}.${signature}`;
  }

  private parseCredentials(raw: string | undefined): ServiceAccountCredentials | null {
    if (!raw || raw.trim().length === 0) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<ServiceAccountCredentials>;
      if (!parsed.client_email || !parsed.private_key) {
        this.logger.error(
          "GOOGLE_INDEXING_CREDENTIALS is set but missing client_email/private_key — disabling Indexing pings.",
        );
        return null;
      }
      // Fly secrets often escape newlines in the PEM; restore them.
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key.replace(/\\n/g, "\n"),
      };
    } catch {
      this.logger.error(
        "GOOGLE_INDEXING_CREDENTIALS is not valid JSON — disabling Indexing pings.",
      );
      return null;
    }
  }
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}
