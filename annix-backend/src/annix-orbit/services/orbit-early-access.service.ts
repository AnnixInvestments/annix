import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EmailService } from "../../email/email.service";
import { fromJSDate, now } from "../../lib/datetime";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { OrbitEarlyAccessSignup } from "../entities/orbit-early-access-signup.entity";
import { OrbitEarlyAccessSignupRepository } from "../repositories/orbit-early-access-signup.repository";

export interface EarlyAccessSignupInput {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  currentRole?: string | null;
  industry?: string | null;
  yearsExperience?: string | null;
  ageRange?: string | null;
  ethnicBackground?: string | null;
  consentToContact: boolean;
  source?: string | null;
  campaign?: string | null;
  platform?: string | null;
  referredBy?: string | null;
}

export interface EarlyAccessSignupResult {
  referralCode: string;
  alreadyOnList: boolean;
  totalSignups: number;
  position: number;
  referralCount: number;
}

export type RankedEarlyAccessRow = OrbitEarlyAccessSignup & { position: number };

export interface CountBucket {
  key: string;
  count: number;
}

export interface EarlyAccessStats {
  total: number;
  today: number;
  thisWeek: number;
  bySource: CountBucket[];
  byCampaign: CountBucket[];
  byIndustry: CountBucket[];
  topReferrers: CountBucket[];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeMobile(mobile: string): string {
  return mobile.replace(/[^\d+]/g, "");
}

function bucket(values: Array<string | null>): CountBucket[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw && raw.trim() !== "" ? raw : "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

@Injectable()
export class OrbitEarlyAccessService {
  private readonly logger = new Logger(OrbitEarlyAccessService.name);

  constructor(
    private readonly repo: OrbitEarlyAccessSignupRepository,
    private readonly emailService: EmailService,
  ) {}

  private generateReferralCode(): string {
    return randomUUID().replace(/-/g, "").slice(0, 10);
  }

  async signup(input: EarlyAccessSignupInput): Promise<EarlyAccessSignupResult> {
    const emailNormalized = normalizeEmail(input.email);
    const mobileNormalized = normalizeMobile(input.mobileNumber);

    const existingByEmail = await this.repo.findByEmailNormalized(emailNormalized);
    const existingByMobile = existingByEmail
      ? null
      : await this.repo.findByMobileNormalized(mobileNormalized);
    const existing = existingByEmail ?? existingByMobile;

    if (existing) {
      existing.firstName = input.firstName;
      existing.lastName = input.lastName;
      existing.currentRole = input.currentRole ?? existing.currentRole;
      existing.industry = input.industry ?? existing.industry;
      existing.yearsExperience = input.yearsExperience ?? existing.yearsExperience;
      existing.ageRange = input.ageRange ?? existing.ageRange;
      existing.ethnicBackground = input.ethnicBackground ?? existing.ethnicBackground;
      existing.consentToContact = input.consentToContact;
      if (input.consentToContact && !existing.consentedAt) {
        existing.consentedAt = now().toJSDate();
      }
      await this.repo.save(existing);
      return this.resultFor(existing.referralCode, true);
    }

    const referralCode = this.generateReferralCode();
    const created = await this.repo.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.trim(),
      emailNormalized,
      mobileNumber: input.mobileNumber.trim(),
      mobileNormalized,
      currentRole: input.currentRole ?? null,
      industry: input.industry ?? null,
      yearsExperience: input.yearsExperience ?? null,
      ageRange: input.ageRange ?? null,
      ethnicBackground: input.ethnicBackground ?? null,
      consentToContact: input.consentToContact,
      consentedAt: input.consentToContact ? now().toJSDate() : null,
      source: input.source && input.source.trim() !== "" ? input.source : "direct",
      campaign: input.campaign ?? null,
      platform: input.platform ?? null,
      referralCode,
      referredBy: input.referredBy ?? null,
      referralCount: 0,
    });

    await this.creditReferrer(input.referredBy ?? null);
    await this.sendWelcome(created);

    return this.resultFor(created.referralCode, false);
  }

  private rank(all: OrbitEarlyAccessSignup[]): RankedEarlyAccessRow[] {
    const sorted = [...all].sort((a, b) => {
      const refDiff = (b.referralCount ?? 0) - (a.referralCount ?? 0);
      if (refDiff !== 0) return refDiff;
      const at = a.createdAt ? fromJSDate(a.createdAt).toMillis() : 0;
      const bt = b.createdAt ? fromJSDate(b.createdAt).toMillis() : 0;
      return at - bt;
    });
    return sorted.map((signup, index) => ({ ...signup, position: index + 1 }));
  }

  async rankedList(): Promise<RankedEarlyAccessRow[]> {
    const all = await this.repo.listNewestFirst();
    return this.rank(all);
  }

  private async resultFor(
    referralCode: string,
    alreadyOnList: boolean,
  ): Promise<EarlyAccessSignupResult> {
    const ranked = await this.rankedList();
    const me = ranked.find((row) => row.referralCode === referralCode);
    const position = me ? me.position : ranked.length;
    const referralCount = me ? (me.referralCount ?? 0) : 0;
    return { referralCode, alreadyOnList, totalSignups: ranked.length, position, referralCount };
  }

  private async creditReferrer(referredBy: string | null): Promise<void> {
    if (!referredBy) {
      return;
    }
    const referrer = await this.repo.findByReferralCode(referredBy);
    if (!referrer) {
      return;
    }
    referrer.referralCount = (referrer.referralCount ?? 0) + 1;
    await this.repo.save(referrer);
  }

  private async sendWelcome(signup: OrbitEarlyAccessSignup): Promise<void> {
    try {
      const sent = await this.emailService.sendAnnixOrbitEarlyAccessWelcome(
        signup.email,
        signup.firstName,
        this.referralLink(signup.referralCode),
      );
      if (sent) {
        signup.welcomeSentAt = now().toJSDate();
        await this.repo.save(signup);
      }
    } catch (error) {
      this.logger.warn(`Early-access welcome email failed for ${signup.email}: ${String(error)}`);
    }
  }

  private referralLink(code: string): string {
    const base =
      process.env.ORBIT_PUBLIC_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    return `${base}/annix/orbit/seeker/register-interest?ref=${code}`;
  }

  async totalCount(): Promise<number> {
    return this.repo.count();
  }

  async listAll(): Promise<RankedEarlyAccessRow[]> {
    return this.rankedList();
  }

  async stats(): Promise<EarlyAccessStats> {
    const all = await this.repo.listNewestFirst();
    const startOfToday = now().startOf("day");
    const startOfWeek = now().startOf("week");

    const today = all.filter((s) => fromJSDate(s.createdAt) >= startOfToday).length;
    const thisWeek = all.filter((s) => fromJSDate(s.createdAt) >= startOfWeek).length;

    const referrers = all
      .filter((s) => (s.referralCount ?? 0) > 0)
      .sort((a, b) => (b.referralCount ?? 0) - (a.referralCount ?? 0))
      .slice(0, 10)
      .map((s) => ({
        key: `${s.firstName} ${s.lastName} (${s.referralCode})`,
        count: s.referralCount ?? 0,
      }));

    return {
      total: all.length,
      today,
      thisWeek,
      bySource: bucket(all.map((s) => s.source)),
      byCampaign: bucket(all.map((s) => s.campaign)),
      byIndustry: bucket(all.map((s) => s.industry)),
      topReferrers: referrers,
    };
  }

  buildCsv(rows: RankedEarlyAccessRow[]): string {
    const header = [
      "Queue Position",
      "First Name",
      "Last Name",
      "Email",
      "Mobile",
      "Current Role",
      "Industry",
      "Years Experience",
      "Age Range",
      "Ethnic Background",
      "Consent",
      "Source",
      "Campaign",
      "Referral Code",
      "Referred By",
      "Referrals",
      "Joined",
    ];
    const escapeCsv = (value: string | number | boolean | null): string => {
      const text = value === null || value === undefined ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const lines = rows.map((r) =>
      [
        r.position,
        r.firstName,
        r.lastName,
        r.email,
        r.mobileNumber,
        r.currentRole,
        r.industry,
        r.yearsExperience,
        r.ageRange,
        r.ethnicBackground,
        r.consentToContact ? "yes" : "no",
        r.source,
        r.campaign,
        r.referralCode,
        r.referredBy,
        r.referralCount,
        r.createdAt ? fromJSDate(r.createdAt).toISO() : null,
      ]
        .map(escapeCsv)
        .join(","),
    );
    return [header.map(escapeCsv).join(","), ...lines].join("\n");
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: "annix-orbit:early-access-drip" })
  async runDripSequence(): Promise<void> {
    if (!isAnnixOrbitCronEnabled()) {
      return;
    }
    const all = await this.repo.listNewestFirst();
    const ageDays = (createdAt: Date): number => now().diff(fromJSDate(createdAt), "days").days;

    const day3 = all.filter((s) => !s.day3SentAt && ageDays(s.createdAt) >= 3);
    const day7 = all.filter((s) => !s.day7SentAt && ageDays(s.createdAt) >= 7);

    for (const signup of day3) {
      const sent = await this.emailService.sendAnnixOrbitEarlyAccessWelcome(
        signup.email,
        signup.firstName,
        this.referralLink(signup.referralCode),
      );
      if (sent) {
        signup.day3SentAt = now().toJSDate();
        await this.repo.save(signup);
      }
    }
    for (const signup of day7) {
      const sent = await this.emailService.sendAnnixOrbitEarlyAccessWelcome(
        signup.email,
        signup.firstName,
        this.referralLink(signup.referralCode),
      );
      if (sent) {
        signup.day7SentAt = now().toJSDate();
        await this.repo.save(signup);
      }
    }
  }
}
