import { classifyCredentialExpiry, DEFAULT_EXPIRY_WARN_DAYS, toIsoDate } from "./credential-expiry";

// Site-Ready / Compliance-Readiness score (issue #362 phase 4). A pure
// 0-100 measure of how deployable a candidate's Skills Passport is right
// now: many valid, verified, non-expiring credentials score high; expired
// or unverified ones drag it down. Computed on read — no stored score, so
// it stays correct as expiry dates pass (no daily recompute job, infra-light).
// Modelled in spirit on Annix Sentinel's compliance score, adapted to a
// per-person passport.

export type SiteReadyStatus = "ready" | "nearly" | "not_ready" | "no_passport";

export interface SiteReadyGap {
  credentialType: string;
  status: "expired" | "expiring";
  expiresAt: string | null;
}

export interface SiteReadyResult {
  score: number;
  status: SiteReadyStatus;
  total: number;
  validCount: number;
  expiringCount: number;
  expiredCount: number;
  verifiedCount: number;
  gaps: SiteReadyGap[];
}

export interface ScoreableCredential {
  credentialType: string;
  expiresAt: string | Date | null;
  verified: boolean;
}

// Per-credential contribution to the score. Verified-and-valid is the
// gold standard; expired tickets are disqualifying (0); expiring soon is
// a strong warning; undated credentials (no expiry) are usable but slightly
// discounted because nothing confirms they're still current.
const POINTS = {
  validVerified: 1,
  validUnverified: 0.7,
  noneVerified: 0.85,
  noneUnverified: 0.6,
  expiring: 0.4,
  expired: 0,
} as const;

export const SITE_READY_THRESHOLDS = { ready: 80, nearly: 50 } as const;

function pointsFor(credential: ScoreableCredential, today: string, warnWithinDays: number): number {
  const status = classifyCredentialExpiry(credential.expiresAt, today, warnWithinDays);
  if (status === "expired") return POINTS.expired;
  if (status === "expiring") return POINTS.expiring;
  if (status === "none") {
    return credential.verified ? POINTS.noneVerified : POINTS.noneUnverified;
  }
  return credential.verified ? POINTS.validVerified : POINTS.validUnverified;
}

function statusForScore(score: number): SiteReadyStatus {
  if (score >= SITE_READY_THRESHOLDS.ready) return "ready";
  if (score >= SITE_READY_THRESHOLDS.nearly) return "nearly";
  return "not_ready";
}

export function computeSiteReady(
  credentials: ScoreableCredential[],
  today: string,
  warnWithinDays: number = DEFAULT_EXPIRY_WARN_DAYS,
): SiteReadyResult {
  if (credentials.length === 0) {
    return {
      score: 0,
      status: "no_passport",
      total: 0,
      validCount: 0,
      expiringCount: 0,
      expiredCount: 0,
      verifiedCount: 0,
      gaps: [],
    };
  }

  const tally = credentials.reduce(
    (acc, credential) => {
      const status = classifyCredentialExpiry(credential.expiresAt, today, warnWithinDays);
      acc.points += pointsFor(credential, today, warnWithinDays);
      if (credential.verified) acc.verifiedCount += 1;
      if (status === "expired") {
        acc.expiredCount += 1;
        acc.gaps.push({
          credentialType: credential.credentialType,
          status,
          expiresAt: toIsoDate(credential.expiresAt),
        });
      } else if (status === "expiring") {
        acc.expiringCount += 1;
        acc.gaps.push({
          credentialType: credential.credentialType,
          status,
          expiresAt: toIsoDate(credential.expiresAt),
        });
      } else {
        acc.validCount += 1;
      }
      return acc;
    },
    {
      points: 0,
      validCount: 0,
      expiringCount: 0,
      expiredCount: 0,
      verifiedCount: 0,
      gaps: [] as SiteReadyGap[],
    },
  );

  const score = Math.round((100 * tally.points) / credentials.length);
  return {
    score,
    status: statusForScore(score),
    total: credentials.length,
    validCount: tally.validCount,
    expiringCount: tally.expiringCount,
    expiredCount: tally.expiredCount,
    verifiedCount: tally.verifiedCount,
    gaps: tally.gaps,
  };
}
