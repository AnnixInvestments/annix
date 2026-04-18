import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThan, Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { DateTime } from "../../lib/datetime";
import { WebPushChannel, WebPushSendResult } from "../../notifications/channels/web-push.channel";
import { NotificationDispatcherService } from "../../notifications/notification-dispatcher.service";
import { User } from "../../user/entities/user.entity";
import { isCvAssistantCronEnabled } from "../cv-assistant-cron.config";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import { CvAssistantProfile } from "../entities/cv-assistant-profile.entity";
import { CvPushSubscription } from "../entities/cv-push-subscription.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: { url?: string };
}

@Injectable()
export class CvNotificationService {
  private readonly logger = new Logger(CvNotificationService.name);

  constructor(
    @InjectRepository(CvAssistantProfile)
    private readonly profileRepo: Repository<CvAssistantProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CvPushSubscription)
    private readonly pushSubRepo: Repository<CvPushSubscription>,
    @InjectRepository(CandidateJobMatch)
    private readonly matchRepo: Repository<CandidateJobMatch>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly webPushChannel: WebPushChannel,
  ) {}

  vapidPublicKey(): string | null {
    return this.webPushChannel.vapidPublicKey();
  }

  async subscribe(
    userId: number,
    companyId: number,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    const existing = await this.pushSubRepo.findOne({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      existing.userId = userId;
      existing.companyId = companyId;
      existing.keyP256dh = subscription.keys.p256dh;
      existing.keyAuth = subscription.keys.auth;
      await this.pushSubRepo.save(existing);
    } else {
      await this.pushSubRepo.save(
        this.pushSubRepo.create({
          userId,
          companyId,
          endpoint: subscription.endpoint,
          keyP256dh: subscription.keys.p256dh,
          keyAuth: subscription.keys.auth,
        }),
      );
    }

    await this.profileRepo.update({ userId }, { pushEnabled: true });
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.pushSubRepo.delete({ userId, endpoint });

    const remaining = await this.pushSubRepo.count({ where: { userId } });
    if (remaining === 0) {
      await this.profileRepo.update({ userId }, { pushEnabled: false });
    }
  }

  async sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
    if (!this.webPushChannel.isEnabled()) {
      return;
    }

    const subscriptions = await this.pushSubRepo.find({ where: { userId } });
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
        await this.pushSubRepo.delete(staleIds);
      }
    }
  }

  async notifyRecruitersOfHighMatch(
    candidateId: number,
    matches: Array<{ externalJobId: number; overallScore: number }>,
  ): Promise<void> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting"],
    });

    if (!candidate) {
      return;
    } else {
      const companyId = candidate.jobPosting.companyId;
      const profiles = await this.profileRepo.find({
        where: { companyId },
        relations: ["user"],
      });
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

            const job = await this.externalJobRepo.findOne({
              where: { id: topMatch.externalJobId },
            });
            const scorePct = Math.round(topMatch.overallScore * 100);
            const userName =
              [profile.user.firstName, profile.user.lastName].filter(Boolean).join(" ") ||
              profile.user.email;

            if (profile.digestEnabled) {
              await this.emailService.sendCvAssistantMatchAlertEmail(
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
                data: { url: `/cv-assistant/portal/candidates/${candidateId}` },
              });
            }
          }),
      );
    }
  }

  @Cron(CronExpression.EVERY_WEEK, { name: "cv-assistant:weekly-digests" })
  async sendWeeklyDigests(): Promise<void> {
    if (!isCvAssistantCronEnabled()) return;
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();

    const companies = await this.profileRepo
      .createQueryBuilder("profile")
      .select("DISTINCT profile.company_id", "companyId")
      .where("profile.digest_enabled = true")
      .getRawMany();

    const companyCounts = await Promise.all(
      companies.map(async ({ companyId }) => {
        const jobPostings = await this.jobPostingRepo.find({
          where: { companyId, status: JobPostingStatus.ACTIVE },
        });

        if (jobPostings.length === 0) {
          return 0;
        } else {
          const recruiterProfiles = await this.profileRepo.find({
            where: { companyId, digestEnabled: true },
            relations: ["user"],
          });
          const recruiters = recruiterProfiles.map((p) => ({
            email: p.user.email,
            name: [p.user.firstName, p.user.lastName].filter(Boolean).join(" ") || p.user.email,
          }));

          const jobPostingIds = jobPostings.map((jp) => jp.id);
          const candidates = await this.candidateRepo.find({
            where: { jobPostingId: In(jobPostingIds), createdAt: MoreThan(sevenDaysAgo) },
          });

          const recentMatches = await this.matchRepo
            .createQueryBuilder("match")
            .leftJoinAndSelect("match.externalJob", "job")
            .leftJoinAndSelect("match.candidate", "candidate")
            .where("match.created_at > :since", { since: sevenDaysAgo })
            .andWhere(
              "match.candidate_id IN (SELECT id FROM cv_assistant_candidates WHERE job_posting_id IN (:...ids))",
              { ids: jobPostingIds },
            )
            .andWhere("match.overall_score >= 0.7")
            .orderBy("match.overall_score", "DESC")
            .take(10)
            .getMany();

          const results = await Promise.all(
            recruiters.map((recruiter) =>
              this.emailService.sendCvAssistantWeeklyDigestEmail(recruiter.email, recruiter.name, {
                newCandidates: candidates.length,
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

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: "cv-assistant:job-alerts" })
  async sendCandidateJobAlerts(): Promise<void> {
    if (!isCvAssistantCronEnabled()) return;
    const oneDayAgo = DateTime.now().minus({ days: 1 }).toJSDate();

    const optedInCandidates = await this.candidateRepo.find({
      where: { jobAlertsOptIn: true, popiaConsent: true },
    });

    const results = await Promise.all(
      optedInCandidates
        .filter((candidate) => candidate.email && candidate.embedding)
        .map(async (candidate) => {
          const recentMatches = await this.matchRepo
            .createQueryBuilder("match")
            .leftJoinAndSelect("match.externalJob", "job")
            .where("match.candidate_id = :candidateId", { candidateId: candidate.id })
            .andWhere("match.created_at > :since", { since: oneDayAgo })
            .andWhere("match.overall_score >= 0.6")
            .orderBy("match.overall_score", "DESC")
            .take(5)
            .getMany();

          if (recentMatches.length === 0) {
            return 0;
          } else {
            const sent = await this.emailService.sendCvAssistantJobAlertEmail(
              candidate.email!,
              candidate.name ?? "Job Seeker",
              recentMatches.map((m) => ({
                title: m.externalJob?.title ?? "Job Opportunity",
                company: m.externalJob?.company ?? null,
                location: m.externalJob?.locationArea ?? null,
                score: Math.round(m.overallScore * 100),
              })),
            );

            return sent ? 1 : 0;
          }
        }),
    );

    const totalSent = results.reduce((sum, val) => sum + val, 0);

    if (totalSent > 0) {
      this.logger.log(`Sent ${totalSent} candidate job alert emails`);
    }
  }
}
