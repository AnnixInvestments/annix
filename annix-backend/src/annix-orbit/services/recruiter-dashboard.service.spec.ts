import type { LicensingService } from "../../licensing/licensing.service";
import type { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import type { UserRepository } from "../../user/user.repository";
import type { AnnixOrbitClientRepository } from "../repositories/annix-orbit-client.repository";
import type { AnnixOrbitPlacementRepository } from "../repositories/annix-orbit-placement.repository";
import type { AnnixOrbitSubmissionRepository } from "../repositories/annix-orbit-submission.repository";
import type { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";
import type { AnnixOrbitTalentCredentialService } from "./annix-orbit-talent-credential.service";
import type { AnnixOrbitTaskService } from "./annix-orbit-task.service";
import { RecruiterDashboardService } from "./recruiter-dashboard.service";

const COMPANY = 10;
const USER = 1;
const NOW = new Date();

function makeService(overrides?: { featureEnabled?: boolean }) {
  const candidateRepo = {
    findVisibleForCompany: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<AnnixOrbitTalentCandidateRepository>;
  const submissionRepo = {
    findByCompany: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<AnnixOrbitSubmissionRepository>;
  const placementRepo = {
    findByCompany: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<AnnixOrbitPlacementRepository>;
  const clientRepo = {
    findByCompany: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<AnnixOrbitClientRepository>;
  const credentialService = {
    expiringSummaryForCompany: jest
      .fn()
      .mockResolvedValue({ candidateCount: 2, credentialCount: 3 }),
  } as unknown as jest.Mocked<AnnixOrbitTalentCredentialService>;
  const taskService = {
    dueTodayCount: jest.fn().mockResolvedValue(4),
  } as unknown as jest.Mocked<AnnixOrbitTaskService>;
  const licensing = {
    isFeatureEnabled: jest.fn().mockResolvedValue(overrides?.featureEnabled ?? false),
  } as unknown as jest.Mocked<LicensingService>;
  const userRepo = {
    findById: jest.fn().mockResolvedValue({ id: 7, firstName: "Lerato", lastName: "Mokoena" }),
  } as unknown as jest.Mocked<UserRepository>;
  const metrics = {
    time: jest.fn((_c: string, _o: string, fn: () => unknown) => fn()),
  } as unknown as jest.Mocked<ExtractionMetricService>;
  const service = new RecruiterDashboardService(
    candidateRepo,
    submissionRepo,
    placementRepo,
    clientRepo,
    credentialService,
    taskService,
    licensing,
    userRepo,
    metrics,
  );
  return { service, candidateRepo, submissionRepo, placementRepo, clientRepo, licensing };
}

describe("RecruiterDashboardService (issue #362 phase 1)", () => {
  it("gates the leaderboard when ANALYTICS is not licensed", async () => {
    const { service } = makeService({ featureEnabled: false });
    const result = await service.dashboard(COMPANY, USER);
    expect(result.topConsultants.gated).toBe(true);
    expect(result.topConsultants.items).toEqual([]);
  });

  it("returns a leaderboard with resolved names when ANALYTICS is licensed", async () => {
    const { service, placementRepo } = makeService({ featureEnabled: true });
    placementRepo.findByCompany.mockResolvedValue([
      { id: 1, consultantUserId: 7, placementFee: 100, createdAt: NOW, clientId: null },
    ] as never);

    const result = await service.dashboard(COMPANY, USER);
    expect(result.topConsultants.gated).toBe(false);
    expect(result.topConsultants.items[0]).toMatchObject({
      userId: 7,
      name: "Lerato Mokoena",
      placements: 1,
      revenue: 100,
    });
  });

  it("builds the candidate funnel from manual stage + submissions", async () => {
    const { service, candidateRepo, submissionRepo } = makeService();
    candidateRepo.findVisibleForCompany.mockResolvedValue([
      { id: 1, fullName: "A", pipelineStage: "identified", status: "active", source: "database" },
      { id: 2, fullName: "B", pipelineStage: "shortlisted", status: "active", source: "referral" },
      { id: 3, fullName: "C", pipelineStage: "identified", status: "active", source: "database" },
    ] as never);
    submissionRepo.findByCompany.mockResolvedValue([
      { id: 1, candidateId: 3, status: "interview", jobTitle: "Welder", createdAt: NOW },
    ] as never);

    const result = await service.dashboard(COMPANY, USER);
    const byKey = Object.fromEntries(result.pipeline.stages.map((s) => [s.key, s.count]));
    expect(byKey.identified).toBe(3);
    expect(byKey.shortlisted).toBe(2); // candidate 2 (manual) + candidate 3 (interview > shortlisted)
    expect(byKey.interview).toBe(1); // candidate 3 via submission
  });

  it("computes KPI values and the source breakdown", async () => {
    const { service, candidateRepo, clientRepo } = makeService();
    candidateRepo.findVisibleForCompany.mockResolvedValue([
      { id: 1, fullName: "A", source: "database", pipelineStage: "identified", status: "active" },
      { id: 2, fullName: "B", source: "referral", pipelineStage: "identified", status: "active" },
    ] as never);
    clientRepo.findByCompany.mockResolvedValue([
      { id: 1, name: "Anglo", status: "active", createdAt: NOW },
      { id: 2, name: "Old", status: "inactive", createdAt: NOW },
    ] as never);

    const result = await service.dashboard(COMPANY, USER);
    expect(result.kpis.totalCandidates.value).toBe(2);
    expect(result.kpis.activeClients.value).toBe(1);
    expect(result.sourceBreakdown.total).toBe(2);
    expect(result.complianceAlerts.candidateCount).toBe(2);
  });
});
