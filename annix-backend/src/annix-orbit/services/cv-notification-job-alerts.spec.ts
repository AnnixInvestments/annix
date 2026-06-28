import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { EmailService } from "../../email/email.service";
import { WebPushChannel } from "../../notifications/channels/web-push.channel";
import { NotificationDispatcherService } from "../../notifications/notification-dispatcher.service";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
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

// A seeker profile carrying its core user (email) + the notification prefs that
// now live on `cv_assistant_profiles` (M5).
function seekerProfile(email: string, matchAlertThreshold: number, digestEnabled: boolean) {
  return { user: { email }, matchAlertThreshold, digestEnabled };
}

describe("CvNotificationService.dispatchCandidateJobAlerts", () => {
  let service: CvNotificationService;
  let candidateRepo: { jobAlertCandidates: jest.Mock };
  let matchRepo: { recentMatchesForCandidate: jest.Mock };
  let profileRepo: { findSeekersWithUser: jest.Mock };
  let emailService: { sendAnnixOrbitJobAlertEmail: jest.Mock };

  beforeEach(async () => {
    candidateRepo = { jobAlertCandidates: jest.fn().mockResolvedValue([]) };
    matchRepo = { recentMatchesForCandidate: jest.fn().mockResolvedValue([]) };
    profileRepo = { findSeekersWithUser: jest.fn().mockResolvedValue([]) };
    emailService = { sendAnnixOrbitJobAlertEmail: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvNotificationService,
        { provide: AnnixOrbitProfileRepository, useValue: profileRepo },
        { provide: CvPushSubscriptionRepository, useValue: {} },
        { provide: CandidateJobMatchRepository, useValue: matchRepo },
        { provide: CandidateRepository, useValue: candidateRepo },
        { provide: JobPostingRepository, useValue: {} },
        { provide: ExternalJobRepository, useValue: {} },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: NotificationDispatcherService, useValue: {} },
        { provide: WebPushChannel, useValue: { vapidPublicKey: () => null } },
      ],
    }).compile();
    service = module.get<CvNotificationService>(CvNotificationService);
  });

  function optedInSeeker() {
    return {
      id: 1,
      email: "seeker@example.com",
      name: "Seeker A",
      embedding: [0.1],
      jobAlertsOptIn: true,
      popiaConsent: true,
    };
  }

  it("emails seekers with consent + opt-in + matches above their profile threshold", async () => {
    candidateRepo.jobAlertCandidates.mockResolvedValue([optedInSeeker()]);
    profileRepo.findSeekersWithUser.mockResolvedValue([
      seekerProfile("seeker@example.com", 70, true),
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

  it("does not email when there are no opted-in candidates", async () => {
    candidateRepo.jobAlertCandidates.mockResolvedValue([]);
    const result = await service.dispatchCandidateJobAlerts();
    expect(result.sent).toBe(0);
    expect(emailService.sendAnnixOrbitJobAlertEmail).not.toHaveBeenCalled();
  });

  it("does not email when the seeker profile has digestEnabled=false", async () => {
    candidateRepo.jobAlertCandidates.mockResolvedValue([optedInSeeker()]);
    profileRepo.findSeekersWithUser.mockResolvedValue([
      seekerProfile("seeker@example.com", 70, false),
    ]);

    const result = await service.dispatchCandidateJobAlerts();
    expect(result.sent).toBe(0);
    expect(emailService.sendAnnixOrbitJobAlertEmail).not.toHaveBeenCalled();
  });

  it("uses the seeker profile's matchAlertThreshold (matches below threshold filtered)", async () => {
    candidateRepo.jobAlertCandidates.mockResolvedValue([optedInSeeker()]);
    profileRepo.findSeekersWithUser.mockResolvedValue([
      seekerProfile("seeker@example.com", 90, true),
    ]);

    await service.dispatchCandidateJobAlerts();

    expect(matchRepo.recentMatchesForCandidate).toHaveBeenCalledWith(1, expect.anything(), 0.9);
  });

  it("pins the 0.6 default threshold when no seeker profile matches the candidate email", async () => {
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
    profileRepo.findSeekersWithUser.mockResolvedValue([]);

    await service.dispatchCandidateJobAlerts();

    expect(matchRepo.recentMatchesForCandidate).toHaveBeenCalledWith(1, expect.anything(), 0.6);
  });
});
