import { DEFAULT_MATCH_TIER, isMatchTier } from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { type DateTime, fromISO, fromJSDate, now } from "../../lib/datetime";
import {
  type ChannelKey,
  NotificationDispatcherService,
} from "../../notifications/notification-dispatcher.service";
import { UserRepository } from "../../user/user.repository";
import { isAnnixOrbitBillingEnforced } from "../annix-orbit-billing.config";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { SeekerInterviewEvent } from "../entities/seeker-interview-event.entity";
import { isOrbitBillingStatus, resolveEntitledTier } from "../lib/seeker-entitlement";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";
import { SeekerInterviewEventRepository } from "../repositories/seeker-interview-event.repository";
import { SeekerInterviewReminderRepository } from "../repositories/seeker-interview-reminder.repository";

type ReminderOffset = "24h" | "1h";

function asDateTime(value: Date | string | null | undefined): DateTime | null {
  if (value == null) return null;
  const dt = typeof value === "string" ? fromISO(value) : fromJSDate(value);
  return dt.isValid ? dt : null;
}

@Injectable()
export class InterviewReminderService {
  private readonly logger = new Logger(InterviewReminderService.name);

  constructor(
    private readonly interviewEventRepo: SeekerInterviewEventRepository,
    private readonly reminderRepo: SeekerInterviewReminderRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly userRepo: UserRepository,
    private readonly tierCapabilityRepo: OrbitTierCapabilityRepository,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly configService: ConfigService,
  ) {}

  @Cron("*/30 * * * *", { name: "annix-orbit:interview-reminders" })
  async run(): Promise<{ sent: number }> {
    if (!isAnnixOrbitCronEnabled()) return { sent: 0 };
    return this.dispatchDueReminders();
  }

  async dispatchDueReminders(): Promise<{ sent: number }> {
    const current = now();
    const horizon = current.plus({ hours: 25 }).toJSDate();
    const events = await this.interviewEventRepo.startingBetween(current.toJSDate(), horizon);
    const active = events.filter((event) => event.cancelledAt == null);
    const results = await Promise.all(active.map((event) => this.processEvent(event, current)));
    const sent = results.filter(Boolean).length;
    return { sent };
  }

  private async processEvent(event: SeekerInterviewEvent, current: DateTime): Promise<boolean> {
    const start = asDateTime(event.startsAt);
    if (!start) return false;
    const minutesUntil = (start.toMillis() - current.toMillis()) / 60000;
    const offset = this.dueOffset(minutesUntil);
    if (!offset) return false;

    const alreadySent = await this.reminderRepo.findSent("self", event.id, offset);
    if (alreadySent) return false;

    const channels = await this.channelsForCandidate(event.candidateId);
    if (!channels) return false;

    const content = this.buildContent(event, offset, start);
    if (this.isProduction()) {
      await this.dispatcher.dispatch({
        recipient: { email: channels.email, phone: channels.phone },
        content,
        channels: channels.channels,
      });
    } else {
      this.logger.log(
        `[dev] would remind ${channels.email} via ${channels.channels.join(",")} for interview ${event.id} (${offset})`,
      );
    }

    await this.reminderRepo.create({
      candidateId: event.candidateId,
      source: "self",
      sourceId: event.id,
      offset,
      sentAt: now().toJSDate(),
    });
    return true;
  }

  private dueOffset(minutesUntil: number): ReminderOffset | null {
    if (minutesUntil > 0 && minutesUntil <= 60) return "1h";
    if (minutesUntil > 60 && minutesUntil <= 1440) return "24h";
    return null;
  }

  private async channelsForCandidate(
    candidateId: number,
  ): Promise<{ email: string; phone: string | null; channels: ChannelKey[] } | null> {
    const candidate = await this.candidateRepo.findById(candidateId);
    const email = candidate ? candidate.email : null;
    if (!email) return null;
    const user = await this.userRepo.findOrbitUserByEmail(email);
    if (!user) return null;
    const profile = await this.profileRepo.findByUserId(user.id);
    if (!profile) return null;

    const wantEmail = profile.interviewReminderEmail !== false;
    const wantSms = profile.interviewReminderSms === true;
    const wantWhatsapp = profile.interviewReminderWhatsapp === true;
    const phone = profile.phone ? profile.phone : null;

    const tier = resolveEntitledTier({
      requestedTier:
        profile.selectedTier && isMatchTier(profile.selectedTier)
          ? profile.selectedTier
          : (candidate?.matchTier ?? DEFAULT_MATCH_TIER),
      trialTier: candidate?.trialTier ?? null,
      trialEndsAt: candidate?.trialEndsAt ?? null,
      entitledTier: profile.entitledTier ?? null,
      billingStatus: isOrbitBillingStatus(profile.billingStatus) ? profile.billingStatus : null,
      paidUntil: profile.paidUntil ?? null,
      enforced: isAnnixOrbitBillingEnforced(),
      nowMillis: now().toMillis(),
    });
    const tierCapability = await this.tierCapabilityRepo.findByTier(tier);
    const features = tierCapability ? tierCapability.features : null;
    const multiChannel = features ? features.multiChannelReminders === true : false;

    const channels: ChannelKey[] = [];
    if (wantEmail) channels.push("email");
    if (multiChannel && phone) {
      if (wantSms) channels.push("sms");
      if (wantWhatsapp) channels.push("whatsapp");
    }
    if (channels.length === 0) return null;
    return { email, phone, channels };
  }

  private buildContent(
    event: SeekerInterviewEvent,
    offset: ReminderOffset,
    start: DateTime,
  ): { subject: string; body: string } {
    const role = event.roleTitle ? event.roleTitle : null;
    const company = event.companyName ? event.companyName : null;
    const what = role ? role : "your interview";
    const at = company ? ` at ${company}` : "";
    const when = offset === "1h" ? "in about an hour" : "tomorrow";
    const timeStr = start.toFormat("HH:mm");
    const location = event.locationLabel ? ` Location: ${event.locationLabel}.` : "";
    return {
      subject: `Interview reminder — ${what}${at}`,
      body: `Reminder: your interview${at} for ${what} is ${when} (${timeStr}).${location}`,
    };
  }

  private isProduction(): boolean {
    return this.configService.get<string>("NODE_ENV") === "production";
  }
}
