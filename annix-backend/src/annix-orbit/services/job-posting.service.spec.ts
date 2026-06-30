import { JobPostingStatus } from "../entities/job-posting.entity";
import { JobPostingService } from "./job-posting.service";

describe("JobPostingService", () => {
  const jobPostingRepo = {
    create: jest.fn(),
    findByReferenceNumber: jest.fn(),
  };
  const companyRepo = {};
  const jobSkillRepo = {};
  const jobSuccessMetricRepo = {};
  const jobScreeningQuestionRepo = {};
  const portalPostingOrchestrator = {};
  const txRunner = {};

  const service = () =>
    new JobPostingService(
      jobPostingRepo as never,
      companyRepo as never,
      jobSkillRepo as never,
      jobSuccessMetricRepo as never,
      jobScreeningQuestionRepo as never,
      portalPostingOrchestrator as never,
      txRunner as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jobPostingRepo.findByReferenceNumber.mockResolvedValue(null);
    jobPostingRepo.create.mockImplementation(async (data) => ({ id: 123, ...data }));
  });

  it("creates a wizard draft with every schema-required default", async () => {
    const draft = await service().createDraft(45);

    expect(jobPostingRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 45,
        title: "Untitled draft",
        status: JobPostingStatus.DRAFT,
        salaryCurrency: "ZAR",
        responseTimelineDays: 14,
        requiredSkills: [],
        requiredCertifications: [],
        enabledPortalCodes: [],
        benefits: [],
        autoRejectEnabled: false,
        autoRejectThreshold: 35,
        autoAcceptThreshold: 85,
        testMode: false,
        qualityScore: 0,
        inclusivityScore: 0,
      }),
    );
    expect(draft.referenceNumber).toMatch(/^JOB-[A-Z2-9]{6}$/);
  });
});
