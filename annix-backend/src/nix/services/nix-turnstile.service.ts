import { randomBytes } from "node:crypto";
import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { fromJSDate, now, nowMillis } from "../../lib/datetime";
import type { ThrottlerHit } from "../../shared/throttler/throttler-hit.schema";

const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SESSION_KEY_PREFIX = "nix-turnstile-session";
const SESSION_TTL_MINUTES = 30;

/**
 * Invisible Cloudflare Turnstile (proof-of-human) gate for the FIRST cost-bearing
 * ANONYMOUS Nix action — defence in depth ON TOP of the per-IP throttle + daily
 * ceilings. Ships DORMANT: when `TURNSTILE_SECRET_KEY` is unset the whole gate is
 * a NO-OP, so it can be flipped on later purely by provisioning the secret.
 *
 * Flow: a valid Turnstile token (verified against Cloudflare siteverify) mints a
 * short-lived (30-min) session token, stored in the shared `throttler_hits`
 * collection (no new collection) keyed by a random id; subsequent anonymous calls
 * present that session token and skip the challenge (no re-challenge). The check
 * is NEVER applied to authenticated callers or to flows that already carry a
 * server-validated scope token (magic-link / anon-draft) or skipExtraction
 * archival — the caller decides exemption and only invokes this for the rest.
 */
@Injectable()
export class NixTurnstileService {
  private readonly logger = new Logger(NixTurnstileService.name);

  constructor(@InjectModel("ThrottlerHit") private readonly model: Model<ThrottlerHit>) {}

  enabled(): boolean {
    return Boolean(process.env.TURNSTILE_SECRET_KEY);
  }

  /**
   * NO-OP when disabled. When enabled: a valid prior session token short-circuits
   * (no re-challenge, `issuedSession=null`); otherwise a valid Turnstile token
   * mints + returns a new session token; anything else throws Forbidden.
   */
  async assertHuman(params: {
    turnstileToken?: string | null;
    sessionToken?: string | null;
    remoteIp?: string | null;
  }): Promise<{ issuedSession: string | null }> {
    if (!this.enabled()) {
      return { issuedSession: null };
    }
    if (params.sessionToken && (await this.validateSession(params.sessionToken))) {
      return { issuedSession: null };
    }
    if (params.turnstileToken && (await this.verify(params.turnstileToken, params.remoteIp))) {
      return { issuedSession: await this.issueSession() };
    }
    throw new ForbiddenException("Human verification required — please retry.");
  }

  private async verify(token: string, remoteIp?: string | null): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return false;
    }
    try {
      const body = new URLSearchParams({ secret, response: token });
      if (remoteIp) {
        body.set("remoteip", remoteIp);
      }
      const res = await fetch(TURNSTILE_SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        // Cap the siteverify round-trip so a hung Cloudflare response can't hold
        // a Fly request slot; the AbortError fails closed via the catch below.
        signal: AbortSignal.timeout(3000),
      });
      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    } catch (err) {
      // Fail-closed: a siteverify outage / timeout rejects rather than waving traffic through.
      this.logger.warn(
        `Turnstile siteverify failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  private async issueSession(): Promise<string> {
    const id = randomBytes(24).toString("hex");
    const expiresAt = now().plus({ minutes: SESSION_TTL_MINUTES }).toJSDate();
    await this.model.create({ key: `${SESSION_KEY_PREFIX}:${id}`, totalHits: 1, expiresAt });
    return id;
  }

  private async validateSession(sessionId: string): Promise<boolean> {
    const doc = await this.model
      .findOne({ key: `${SESSION_KEY_PREFIX}:${sessionId}` })
      .lean()
      .exec();
    if (!doc?.expiresAt) {
      return false;
    }
    return fromJSDate(doc.expiresAt).toMillis() > nowMillis();
  }
}
