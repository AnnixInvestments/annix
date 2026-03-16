import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThan, Repository } from "typeorm";
import * as webpush from "web-push";
import { EmailService } from "../../email/email.service";
import { DateTime } from "../../lib/datetime";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import { CvAssistantUser } from "../entities/cv-assistant-user.entity";
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
  private readonly pushEnabled: boolean;

  constructor(
    @InjectRepository(CvAssistantUser)
    private readonly userRepo: Repository<CvAssistantUser>,
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
  ) {
    const publicKey = this.configService.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.configService.get<string>("VAPID_PRIVATE_KEY");
    const subject = this.configService.get<string>("VAPID_SUBJECT", "mailto:admin@annix.co.za");

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.pushEnabled = true;
    } else {
      this.pushEnabled = false;
    }
  }

  vapidPublicKey(): string | null {
    return this.configService.get<string>("VAPID_PUBLIC_KEY") ?? null;
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

    await this.userRepo.update(userId, { pushEnabled: true });
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.pushSubRepo.delete({ userId, endpoint });

    const remaining = await this.pushSubRepo.count({ where: { userId } });
    if (remaining === 0) {
      await this.userRepo.update(userId, { pushEnabled: false });
    }
  }

  async sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
    if (!this.pushEnabled) {
      return;
    } else {
      const subscriptions = await this.pushSubRepo.find({ where: { userId } });

      const results = await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.keyP256dh, auth: sub.keyAuth },
              },
              JSON.stringify(payload),
            );
            return null;
          } catch (error: unknown) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 410 || statusCode === 404) {
              return sub.id;
            } else {
              this.logger.warn(
                `Push failed for CV subscription ${sub.id}: ${error instanceof Error ? error.message : String(error)}`,
              );
              return null;
            }
          }
        }),
      );

      const staleIds = results.filter((id): id is number => id !== null);

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
      const recruiters = await this.userRepo.find({ where: { companyId } });
      const highMatches = matches.filter((m) => m.overallScore >= 0.5);

      await Promise.all(
        recruiters
          .filter((recruiter) => {
            const threshold = recruiter.matchAlertThreshold / 100;
            return highMatches.some((m) => m.overallScore >= threshold);
          })
          .map(async (recruiter) => {
            const threshold = recruiter.matchAlertThreshold / 100;
            const qualifyingMatches = highMatches.filter((m) => m.overallScore >= threshold);

            const topMatch = qualifyingMatches.reduce((best, m) =>
              m.overallScore > best.overallScore ? m : best,
            );

            const job = await this.externalJobRepo.findOne({
              where: { id: topMatch.externalJobId },
            });
            const scorePct = Math.round(topMatch.overallScore * 100);

            if (recruiter.digestEnabled) {
              await this.emailService.sendCvAssistantMatchAlertEmail(
                recruiter.email,
                recruiter.name,
                candidate.name ?? "Unknown candidate",
                job?.title ?? "External job",
                scorePct,
              );
            }

            if (recruiter.pushEnabled) {
              await this.sendPushToUser(recruiter.id, {
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
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();

    const companies = await this.userRepo
      .createQueryBuilder("user")
      .select("DISTINCT user.company_id", "companyId")
      .where("user.digest_enabled = true")
      .getRawMany();

    const companyCounts = await Promise.all(
      companies.map(async ({ companyId }) => {
        const jobPostings = await this.jobPostingRepo.find({
          where: { companyId, status: JobPostingStatus.ACTIVE },
        });

        if (jobPostings.length === 0) {
          return 0;
        } else {
          const recruiters = await this.userRepo.find({
            where: { companyId, digestEnabled: true },
          });

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
