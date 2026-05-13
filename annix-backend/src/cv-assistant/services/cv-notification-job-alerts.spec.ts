import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EmailService } from "../../email/email.service";
import { WebPushChannel } from "../../notifications/channels/web-push.channel";
import { NotificationDispatcherService } from "../../notifications/notification-dispatcher.service";
import { User } from "../../user/entities/user.entity";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import { CvAssistantProfile } from "../entities/cv-assistant-profile.entity";
import { CvAssistantUser } from "../entities/cv-assistant-user.entity";
import { CvPushSubscription } from "../entities/cv-push-subscription.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { JobPosting } from "../entities/job-posting.entity";
import { CvNotificationService } from "./cv-notification.service";

interface FakeMatch {
  overallScore: number;
  externalJob: { title: string; company: string | null; locationArea: string | null };
}

function buildMatchQb(results: FakeMatch[]) {
  const qb: Record<string, jest.Mock> = {};
  qb.leftJoinAndSelect = jest.fn(() => qb as never);
  qb.where = jest.fn(() => qb as never);
  qb.andWhere = jest.fn(() => qb as never);
  qb.orderBy = jest.fn(() => qb as never);
  qb.take = jest.fn(() => qb as never);
  qb.getMany = jest.fn().mockResolvedValue(results);
  return qb;
}

describe("CvNotificationService.dispatchCandidateJobAlerts", () => {
  let service: CvNotificationService;
  let candidateRepo: { find: jest.Mock };
  let matchRepo: { createQueryBuilder: jest.Mock };
  let cvUserRepo: { find: jest.Mock };
  let emailService: { sendCvAssistantJobAlertEmail: jest.Mock };

  beforeEach(async () => {
    candidateRepo = { find: jest.fn().mockResolvedValue([]) };
    matchRepo = { createQueryBuilder: jest.fn() };
    cvUserRepo = { find: jest.fn().mockResolvedValue([]) };
    emailService = { sendCvAssistantJobAlertEmail: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvNotificationService,
        { provide: getRepositoryToken(CvAssistantProfile), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(CvPushSubscription), useValue: {} },
        { provide: getRepositoryToken(CandidateJobMatch), useValue: matchRepo },
        { provide: getRepositoryToken(Candidate), useValue: candidateRepo },
        { provide: getRepositoryToken(JobPosting), useValue: {} },
        { provide: getRepositoryToken(ExternalJob), useValue: {} },
        { provide: getRepositoryToken(CvAssistantUser), useValue: cvUserRepo },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: NotificationDispatcherService, useValue: {} },
        { provide: WebPushChannel, useValue: { vapidPublicKey: () => null } },
      ],
    }).compile();
    service = module.get<CvNotificationService>(CvNotificationService);
  });

  it("emails seekers with consent + opt-in + matches above their threshold", async () => {
    candidateRepo.find.mockResolvedValue([
      {
        id: 1,
        email: "seeker@example.com",
        name: "Seeker A",
        embedding: [0.1],
        jobAlertsOptIn: true,
        popiaConsent: true,
      },
    ]);
    cvUserRepo.find.mockResolvedValue([
      { email: "seeker@example.com", matchAlertThreshold: 70, digestEnabled: true },
    ]);
    matchRepo.createQueryBuilder.mockReturnValue(
      buildMatchQb([
        {
          overallScore: 0.82,
          externalJob: { title: "Boilermaker", company: null, locationArea: null },
        },
      ]),
    );

    const result = await service.dispatchCandidateJobAlerts();

    expect(result.sent).toBe(1);
    expect(emailService.sendCvAssistantJobAlertEmail).toHaveBeenCalledTimes(1);
  });

  it("does not email when popiaConsent is false (find already excludes them, sanity)", async () => {
    candidateRepo.find.mockResolvedValue([]);
    const result = await service.dispatchCandidateJobAlerts();
    expect(result.sent).toBe(0);
    expect(emailService.sendCvAssistantJobAlertEmail).not.toHaveBeenCalled();
  });

  it("does not email when seeker user has digestEnabled=false", async () => {
    candidateRepo.find.mockResolvedValue([
      {
        id: 1,
        email: "seeker@example.com",
        name: "Seeker A",
        embedding: [0.1],
        jobAlertsOptIn: true,
        popiaConsent: true,
      },
    ]);
    cvUserRepo.find.mockResolvedValue([
      { email: "seeker@example.com", matchAlertThreshold: 70, digestEnabled: false },
    ]);

    const result = await service.dispatchCandidateJobAlerts();
    expect(result.sent).toBe(0);
    expect(emailService.sendCvAssistantJobAlertEmail).not.toHaveBeenCalled();
  });

  it("uses the seeker user's matchAlertThreshold (matches below threshold filtered)", async () => {
    candidateRepo.find.mockResolvedValue([
      {
        id: 1,
        email: "seeker@example.com",
        name: "Seeker A",
        embedding: [0.1],
        jobAlertsOptIn: true,
        popiaConsent: true,
      },
    ]);
    cvUserRepo.find.mockResolvedValue([
      { email: "seeker@example.com", matchAlertThreshold: 90, digestEnabled: true },
    ]);
    const qb = buildMatchQb([]);
    matchRepo.createQueryBuilder.mockReturnValue(qb);

    await service.dispatchCandidateJobAlerts();

    expect(qb.andWhere).toHaveBeenCalledWith("match.overall_score >= :threshold", {
      threshold: 0.9,
    });
  });

  it("falls back to 0.6 threshold when no seeker user matches the candidate email", async () => {
    candidateRepo.find.mockResolvedValue([
      {
        id: 1,
        email: "recruiter-upload@example.com",
        name: "Recruiter Upload",
        embedding: [0.1],
        jobAlertsOptIn: true,
        popiaConsent: true,
      },
    ]);
    cvUserRepo.find.mockResolvedValue([]);
    const qb = buildMatchQb([]);
    matchRepo.createQueryBuilder.mockReturnValue(qb);

    await service.dispatchCandidateJobAlerts();

    expect(qb.andWhere).toHaveBeenCalledWith("match.overall_score >= :threshold", {
      threshold: 0.6,
    });
  });
});
