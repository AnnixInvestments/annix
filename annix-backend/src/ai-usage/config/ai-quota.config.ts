// Per-tenant AI quota config (#401). Ships OFF. Before setting AI_QUOTA_ENABLED=true
// in any real environment, address the gate-flagged items:
//  1. Migrate more call-sites to pass a SERVER-DERIVED quotaScope+companyId/userId —
//     until then most calls pool into the shared system:<app> bucket, which is a
//     cross-tenant failure domain, not a per-tenant control. The bucket key is
//     caller-asserted, so each call-site MUST pass server-trusted ids, never
//     client-supplied ones.
//  2. Run AI_QUOTA_SHADOW=true first (log-only) and confirm no real tenant nears
//     the ceilings before enforcing.
//  3. Known tradeoff: the daily-budget check fails OPEN on a Mongo error (an infra
//     blip must not take down all AI) and is debit-after-read, so a burst can
//     overspend the daily budget by up to ~one rate-window before the per-minute
//     gate (the hard bound) catches it.
export type AiQuotaScope = "company" | "user" | "system";

export interface AiQuotaLimits {
  dailyTokenBudget: number;
  ratePerMinute: number;
}

export interface AiQuotaConfig {
  enabled: boolean;
  shadow: boolean;
  company: AiQuotaLimits;
  user: AiQuotaLimits;
  system: AiQuotaLimits;
}

const DEFAULTS = {
  company: { dailyTokenBudget: 5_000_000, ratePerMinute: 60 },
  user: { dailyTokenBudget: 1_000_000, ratePerMinute: 20 },
  system: { dailyTokenBudget: 20_000_000, ratePerMinute: 120 },
} satisfies Record<AiQuotaScope, AiQuotaLimits>;

function positiveIntFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : fallback;
}

function boolFromEnv(name: string): boolean {
  return process.env[name] === "true";
}

export function aiQuotaConfig(): AiQuotaConfig {
  return {
    enabled: boolFromEnv("AI_QUOTA_ENABLED"),
    shadow: boolFromEnv("AI_QUOTA_SHADOW"),
    company: {
      dailyTokenBudget: positiveIntFromEnv(
        "AI_DAILY_TOKEN_BUDGET_COMPANY",
        DEFAULTS.company.dailyTokenBudget,
      ),
      ratePerMinute: positiveIntFromEnv("AI_RATE_PER_MINUTE_COMPANY", DEFAULTS.company.ratePerMinute),
    },
    user: {
      dailyTokenBudget: positiveIntFromEnv(
        "AI_DAILY_TOKEN_BUDGET_USER",
        DEFAULTS.user.dailyTokenBudget,
      ),
      ratePerMinute: positiveIntFromEnv("AI_RATE_PER_MINUTE_USER", DEFAULTS.user.ratePerMinute),
    },
    system: {
      dailyTokenBudget: positiveIntFromEnv(
        "AI_DAILY_TOKEN_BUDGET_SYSTEM",
        DEFAULTS.system.dailyTokenBudget,
      ),
      ratePerMinute: positiveIntFromEnv("AI_RATE_PER_MINUTE_SYSTEM", DEFAULTS.system.ratePerMinute),
    },
  };
}
