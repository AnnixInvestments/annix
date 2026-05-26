import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { EmailService } from "../../email/email.service";
import { WebPushChannel } from "../../notifications/channels/web-push.channel";
import { NotificationDispatcherService } from "../../notifications/notification-dispatcher.service";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { AnnixOrbitUserRepository } from "../repositories/annix-orbit-user.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateJobMatchRepository } from "../repositories/candidate-job-match.repository";
import { CvPushSubscriptionRepository } from "../repositories/cv-push-subscription.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { JobPostingRepository } from "../repositories/job-posting.repository";
import { CvNotificationService } from "./cv-notification.service";

interface FakeMatch {
  overallScore: number;
  externalJob: { title: string; company: string | null; locationArea: string | null };
}

describe("CvNotificationService.dispatchCandidateJobAlerts", () => {
  let service: CvNotificationService;
  let candidateRepo: { jobAlertCandidates: jest.Mock };
  let matchRepo: { recentMatchesForCandidate: jest.Mock };
  let cvUserRepo: { findAll: jest.Mock };
  let emailService: { sendAnnixOrbitJobAlertEmail: jest.Mock };

  beforeEach(async () => {
    candidateRepo = { jobAlertCandidates: jest.fn().mockResolvedValue([]) };
    matchRepo = { recentMatchesForCandidate: jest.fn().mockResolvedValue([]) };
    cvUserRepo = { findAll: jest.fn().mockResolvedValue([]) };
    emailService = { sendAnnixOrbitJobAlertEmail: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvNotificationService,
        { provide: AnnixOrbitProfileRepository, useValue: {} },
        { provide: CvPushSubscriptionRepository, useValue: {} },
        { provide: CandidateJobMatchRepository, useValue: matchRepo },
        { provide: CandidateRepository, useValue: candidateRepo },
        { provide: JobPostingRepository, useValue: {} },
        { provide: ExternalJobRepository, useValue: {} },
        { provide: AnnixOrbitUserRepository, useValue: cvUserRepo },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: NotificationDispatcherService, useValue: {} },
        { provide: WebPushChannel, useValue: { vapidPublicKey: () => null } },
      ],
    }).compile();
    service = module.get<CvNotificationService>(CvNotificationService);
  });

  it("emails seekers with consent + opt-in + matches above their threshold", async () => {
    candidateRepo.jobAlertCandidates.mockResolvedValue([
      {
        id: 1,
        email: "seeker@example.com",
        name: "Seeker A",
        embedding: [0.1],
        jobAlertsOptIn: true,
        popiaConsent: true,
      },
    ]);
    cvUserRepo.findAll.mockResolvedValue([
      { email: "seeker@example.com", matchAlertThreshold: 70, digestEnabled: true },
    ]);
    const matches: FakeMatch[] = [
      {
        overallScore: 0.82,
        externalJob: { title: "Boilermaker", company: null, locationArea: null },
      },
    ];
    matchRepo.recentMatchesForCandidate.mockResolvedValue(matches);

    const result = await service.dispatchCandidateJobAlerts();

    expect(result.sent).toBe(1);
    expect(emailService.sendAnnixOrbitJobAlertEmail).toHaveBeenCalledTimes(1);
  });

  it("does not email when popiaConsent is false (find already excludes them, sanity)", async () => {
    candidateRepo.jobAlertCandidates.mockResolvedValue([]);
    const result = await service.dispatchCandidateJobAlerts();
    expect(result.sent).toBe(0);
    expect(emailService.sendAnnixOrbitJobAlertEmail).not.toHaveBeenCalled();
  });

  it("does not email when seeker user has digestEnabled=false", async () => {
    candidateRepo.jobAlertCandidates.mockResolvedValue([
      {
        id: 1,
        email: "seeker@example.com",
        name: "Seeker A",
        embedding: [0.1],
        jobAlertsOptIn: true,
        popiaConsent: true,
      },
    ]);
    cvUserRepo.findAll.mockResolvedValue([
      { email: "seeker@example.com", matchAlertThreshold: 70, digestEnabled: false },
    ]);

    const result = await service.dispatchCandidateJobAlerts();
    expect(result.sent).toBe(0);
    expect(emailService.sendAnnixOrbitJobAlertEmail).not.toHaveBeenCalled();
  });

  it("uses the seeker user's matchAlertThreshold (matches below threshold filtered)", async () => {
    candidateRepo.jobAlertCandidates.mockResolvedValue([
      {
        id: 1,
        email: "seeker@example.com",
        name: "Seeker A",
        embedding: [0.1],
        jobAlertsOptIn: true,
        popiaConsent: true,
      },
    ]);
    cvUserRepo.findAll.mockResolvedValue([
      { email: "seeker@example.com", matchAlertThreshold: 90, digestEnabled: true },
    ]);

    await service.dispatchCandidateJobAlerts();

    expect(matchRepo.recentMatchesForCandidate).toHaveBeenCalledWith(1, expect.any(Date), 0.9);
  });

  it("falls back to 0.6 threshold when no seeker user matches the candidate email", async () => {
    candidateRepo.jobAlertCandidates.mockResolvedValue([
      {
        id: 1,
        email: "recruiter-upload@example.com",
        name: "Recruiter Upload",
        embedding: [0.1],
        jobAlertsOptIn: true,
        popiaConsent: true,
      },
    ]);
    cvUserRepo.findAll.mockResolvedValue([]);

    await service.dispatchCandidateJobAlerts();

    expect(matchRepo.recentMatchesForCandidate).toHaveBeenCalledWith(1, expect.any(Date), 0.6);
  });
});
