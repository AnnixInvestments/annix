import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EmailService } from "../../email/email.service";
import { DateTime } from "../../lib/datetime";
import { WebPushChannel, WebPushSendResult } from "../../notifications/channels/web-push.channel";
import { NotificationDispatcherService } from "../../notifications/notification-dispatcher.service";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateJobMatchRepository } from "../repositories/candidate-job-match.repository";
import { CvPushSubscriptionRepository } from "../repositories/cv-push-subscription.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { JobPostingRepository } from "../repositories/job-posting.repository";

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: { url?: string };
}

// Endpoint defaults (GET /notifications/preferences) — preserve the historical
// notification-preferences contract.
const PREF_DEFAULT_MATCH_ALERT_THRESHOLD = 80;
const PREF_DEFAULT_DIGEST_ENABLED = true;
const PREF_DEFAULT_PUSH_ENABLED = false;

// Seeker job-alert threshold when a candidate's email has no Orbit seeker profile.
// Pinned at 60 (the long-standing default) so repointing prefs to the profile
// does NOT silently change who gets alerted.
const SEEKER_ALERT_THRESHOLD_DEFAULT = 60;

export interface NotificationPreferences {
  matchAlertThreshold: number;
  digestEnabled: boolean;
  pushEnabled: boolean;
}

@Injectable()
export class CvNotificationService {
  private readonly logger = new Logger(CvNotificationService.name);

  constructor(
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly pushSubRepo: CvPushSubscriptionRepository,
    private readonly matchRepo: CandidateJobMatchRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly externalJobRepo: ExternalJobRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly webPushChannel: WebPushChannel,
  ) {}

  vapidPublicKey(): string | null {
    return this.webPushChannel.vapidPublicKey();
  }

  /**
   * Notification preferences live on the Orbit profile (`cv_assistant_profiles`).
   * A null profile yields the historical defaults (preserving the exact contract).
   */
  async getPreferences(userId: number): Promise<NotificationPreferences> {
    const profile = await this.profileRepo.findByUserId(userId);
    return {
      matchAlertThreshold: profile?.matchAlertThreshold ?? PREF_DEFAULT_MATCH_ALERT_THRESHOLD,
      digestEnabled: profile?.digestEnabled ?? PREF_DEFAULT_DIGEST_ENABLED,
      pushEnabled: profile?.pushEnabled ?? PREF_DEFAULT_PUSH_ENABLED,
    };
  }

  async updatePreferences(
    userId: number,
    body: { matchAlertThreshold?: number; digestEnabled?: boolean; pushEnabled?: boolean },
  ): Promise<void> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      // No profile to write to — log and no-op rather than 500.
      this.logger.warn(
        `Notification preferences update skipped — no Orbit profile for user ${userId}`,
      );
      return;
    }
    const updates: {
      matchAlertThreshold?: number;
      digestEnabled?: boolean;
      pushEnabled?: boolean;
    } = {};
    if (body.matchAlertThreshold != null) {
      updates.matchAlertThreshold = Math.max(0, Math.min(100, body.matchAlertThreshold));
    }
    if (body.digestEnabled != null) {
      updates.digestEnabled = body.digestEnabled;
    }
    if (body.pushEnabled != null) {
      updates.pushEnabled = body.pushEnabled;
    }
    await this.profileRepo.setNotificationPreferences(userId, updates);
  }

  async subscribe(
    userId: number,
    companyId: number | null,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    const existing = await this.pushSubRepo.findByEndpoint(subscription.endpoint);

    if (existing) {
      existing.userId = userId;
      existing.companyId = companyId;
      existing.keyP256dh = subscription.keys.p256dh;
      existing.keyAuth = subscription.keys.auth;
      await this.pushSubRepo.save(existing);
    } else {
      await this.pushSubRepo.create({
        userId,
        companyId,
        endpoint: subscription.endpoint,
        keyP256dh: subscription.keys.p256dh,
        keyAuth: subscription.keys.auth,
      });
    }

    await this.profileRepo.setPushEnabledForUser(userId, true);
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.pushSubRepo.deleteByUserEndpoint(userId, endpoint);

    const remaining = await this.pushSubRepo.countForUser(userId);
    if (remaining === 0) {
      await this.profileRepo.setPushEnabledForUser(userId, false);
    }
  }

  async sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
    if (!this.webPushChannel.isEnabled()) {
      return;
    }

    const subscriptions = await this.pushSubRepo.findByUser(userId);
    if (subscriptions.length === 0) {
      return;
    }

    const [result] = await this.dispatcher.dispatch({
      recipient: {
        userId,
        pushSubscriptions: subscriptions.map((sub) => ({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keyP256dh, auth: sub.keyAuth },
        })),
      },
      content: {
        subject: payload.title,
        body: payload.body,
        tag: payload.tag ?? null,
        actionUrl: payload.data?.url ?? null,
      },
      channels: ["web_push"],
    });

    const pushResult = result as WebPushSendResult;
    if (pushResult.staleEndpoints.length > 0) {
      const staleIds = subscriptions
        .filter((sub) => pushResult.staleEndpoints.includes(sub.endpoint))
        .map((sub) => sub.id);
      if (staleIds.length > 0) {
        await this.pushSubRepo.deleteByIds(staleIds);
      }
    }
  }

  async notifyRecruitersOfHighMatch(
    candidateId: number,
    matches: Array<{ externalJobId: number; overallScore: number }>,
  ): Promise<void> {
    const candidate = await this.candidateRepo.findByIdWithJobPosting(candidateId);

    if (!candidate?.jobPosting) {
      return;
    } else {
      const companyId = candidate.jobPosting.companyId;
      const profiles = await this.profileRepo.findByCompanyWithUser(companyId);
      const highMatches = matches.filter((m) => m.overallScore >= 0.5);

      await Promise.all(
        profiles
          .filter((profile) => {
            const threshold = profile.matchAlertThreshold / 100;
            return highMatches.some((m) => m.overallScore >= threshold);
          })
          .map(async (profile) => {
            const threshold = profile.matchAlertThreshold / 100;
            const qualifyingMatches = highMatches.filter((m) => m.overallScore >= threshold);

            const topMatch = qualifyingMatches.reduce((best, m) =>
              m.overallScore > best.overallScore ? m : best,
            );

            const job = await this.externalJobRepo.findById(topMatch.externalJobId);
            const scorePct = Math.round(topMatch.overallScore * 100);
            const userName =
              [profile.user.firstName, profile.user.lastName].filter(Boolean).join(" ") ||
              profile.user.email;

            if (profile.digestEnabled) {
              await this.emailService.sendAnnixOrbitMatchAlertEmail(
                profile.user.email,
                userName,
                candidate.name ?? "Unknown candidate",
                job?.title ?? "External job",
                scorePct,
              );
            }

            if (profile.pushEnabled) {
              await this.sendPushToUser(profile.userId, {
                title: "High-scoring candidate match",
                body: `${candidate.name ?? "A candidate"} matched ${job?.title ?? "a job"} at ${scorePct}%`,
                tag: `match-${candidateId}`,
                data: { url: `/annix/orbit/portal/candidates/${candidateId}` },
              });
            }
          }),
      );
    }
  }

  @Cron(CronExpression.EVERY_WEEK, { name: "annix-orbit:weekly-digests" })
  async sendWeeklyDigests(): Promise<void> {
    if (!isAnnixOrbitCronEnabled()) return;
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();

    const companyIds = await this.profileRepo.digestEnabledCompanyIds();

    const companyCounts = await Promise.all(
      companyIds.map(async (companyId) => {
        const jobPostings = await this.jobPostingRepo.activeForCompany(companyId);

        if (jobPostings.length === 0) {
          return 0;
        } else {
          const recruiterProfiles = await this.profileRepo.findDigestEnabledForCompany(companyId);
          const recruiters = recruiterProfiles.map((p) => ({
            email: p.user.email,
            name: [p.user.firstName, p.user.lastName].filter(Boolean).join(" ") || p.user.email,
          }));

          const jobPostingIds = jobPostings.map((jp) => jp.id);
          const newCandidates = await this.candidateRepo.countNewForJobsSince(
            jobPostingIds,
            sevenDaysAgo,
          );

          const recentMatches = await this.matchRepo.weeklyDigestMatches(
            jobPostingIds,
            sevenDaysAgo,
          );

          const results = await Promise.all(
            recruiters.map((recruiter) =>
              this.emailService.sendAnnixOrbitWeeklyDigestEmail(recruiter.email, recruiter.name, {
                newCandidates,
                topMatches: recentMatches.map((m) => ({
                  candidateName: m.candidate?.name ?? "Unknown",
                  jobTitle: m.externalJob?.title ?? "Unknown job",
                  score: Math.round(m.overallScore * 100),
                })),
                activeJobPostings: jobPostings.length,
              }),
            ),
          );

          return results.filter(Boolean).length;
        }
      }),
    );

    const totalSent = companyCounts.reduce((sum, count) => sum + count, 0);

    if (totalSent > 0) {
      this.logger.log(`Sent ${totalSent} weekly digest emails`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: "annix-orbit:job-alerts" })
  async sendCandidateJobAlerts(): Promise<void> {
    if (!isAnnixOrbitCronEnabled()) return;
    await this.dispatchCandidateJobAlerts();
  }

  async dispatchCandidateJobAlerts(): Promise<{ sent: number }> {
    const oneDayAgo = DateTime.now().minus({ days: 1 }).toJSDate();

    const optedInCandidates = await this.candidateRepo.jobAlertCandidates();

    // Seeker notification prefs live on the Orbit profile; key them by the core
    // user's email so a candidate CV is matched to its owning seeker (if any).
    const seekerProfiles = await this.profileRepo.findSeekersWithUser();
    const profileByEmail = new Map(
      seekerProfiles
        .filter((profile) => profile.user?.email)
        .map((profile) => [profile.user.email.toLowerCase(), profile] as const),
    );

    const results = await Promise.all(
      optedInCandidates
        .filter((candidate) => candidate.email && candidate.embedding)
        .map(async (candidate) => {
          const candidateEmail = candidate.email;
          if (!candidateEmail) return 0;

          const seekerProfile = profileByEmail.get(candidateEmail.toLowerCase()) ?? null;
          if (seekerProfile && !seekerProfile.digestEnabled) {
            return 0;
          }

          const thresholdPct = seekerProfile
            ? seekerProfile.matchAlertThreshold
            : SEEKER_ALERT_THRESHOLD_DEFAULT;
          const thresholdFraction = Math.max(0, Math.min(100, thresholdPct)) / 100;

          const recentMatches = await this.matchRepo.recentMatchesForCandidate(
            candidate.id,
            oneDayAgo,
            thresholdFraction,
          );

          if (recentMatches.length === 0) {
            return 0;
          }

          const sent = await this.emailService.sendAnnixOrbitJobAlertEmail(
            candidateEmail,
            candidate.name ?? "Job Seeker",
            recentMatches.map((m) => ({
              title: m.externalJob?.title ?? "Job Opportunity",
              company: m.externalJob?.company ?? null,
              location: m.externalJob?.locationArea ?? null,
              score: Math.round(m.overallScore * 100),
            })),
          );

          return sent ? 1 : 0;
        }),
    );

    const totalSent = results.reduce((sum, val) => sum + val, 0);

    if (totalSent > 0) {
      this.logger.log(`Sent ${totalSent} candidate job alert emails`);
    }
    return { sent: totalSent };
  }
}
