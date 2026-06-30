import { JobPostingStatus } from "../entities/job-posting.entity";
import { JobPostingService } from "./job-posting.service";

describe("JobPostingService", () => {
  const jobPostingRepo = {
    create: jest.fn(),
    findByReferenceNumber: jest.fn(),
    findWizardDraft: jest.fn(),
    save: jest.fn(),
  };
  const companyRepo = {};
  const jobSkillRepo = {};
  const jobSuccessMetricRepo = {};
  const jobScreeningQuestionRepo = {};
  const portalPostingOrchestrator = {
    postToFreeAdapters: jest.fn(),
    postToSelectedAdapters: jest.fn(),
  };
  const txRunner = {};

  const publishableDraft = (overrides: Record<string, unknown> = {}) => ({
    id: 123,
    status: JobPostingStatus.DRAFT,
    title: "Senior Software Engineer",
    description: "A".repeat(60),
    location: "Cape Town",
    province: "Western Cape",
    employmentType: "full_time",
    enabledPortalCodes: [] as string[],
    testMode: false,
    activatedAt: null,
    ...overrides,
  });

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
    jobPostingRepo.save.mockImplementation(async (draft) => draft);
    portalPostingOrchestrator.postToFreeAdapters.mockResolvedValue({
      attempted: 0,
      succeeded: 0,
      failed: 0,
    });
    portalPostingOrchestrator.postToSelectedAdapters.mockResolvedValue({
      attempted: 0,
      succeeded: 0,
      failed: 0,
    });
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

  describe("publishDraft", () => {
    it("dispatches ZERO portal calls when publishing in test mode", async () => {
      jobPostingRepo.findWizardDraft.mockResolvedValue(publishableDraft());

      const result = await service().publishDraft(45, 123, { testMode: true });

      expect(result.testMode).toBe(true);
      expect(result.status).toBe(JobPostingStatus.ACTIVE);
      // The cost/abuse-sensitive invariant: test mode must never reach a portal.
      expect(portalPostingOrchestrator.postToFreeAdapters).not.toHaveBeenCalled();
      expect(portalPostingOrchestrator.postToSelectedAdapters).not.toHaveBeenCalled();
    });

    it("dispatches to the free adapters on a live publish with no selected portals", async () => {
      jobPostingRepo.findWizardDraft.mockResolvedValue(publishableDraft());

      await service().publishDraft(45, 123, { testMode: false });

      expect(portalPostingOrchestrator.postToFreeAdapters).toHaveBeenCalledTimes(1);
      expect(portalPostingOrchestrator.postToSelectedAdapters).not.toHaveBeenCalled();
    });

    it("dispatches to the selected adapters when enabledPortalCodes is set", async () => {
      jobPostingRepo.findWizardDraft.mockResolvedValue(
        publishableDraft({ enabledPortalCodes: ["gumtree"] }),
      );

      await service().publishDraft(45, 123, { testMode: false });

      expect(portalPostingOrchestrator.postToSelectedAdapters).toHaveBeenCalledWith(
        expect.objectContaining({ id: 123 }),
        ["gumtree"],
      );
      expect(portalPostingOrchestrator.postToFreeAdapters).not.toHaveBeenCalled();
    });
  });
});
