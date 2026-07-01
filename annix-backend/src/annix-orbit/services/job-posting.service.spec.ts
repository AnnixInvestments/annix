import { JobPostingStatus } from "../entities/job-posting.entity";
import { JobPostingService } from "./job-posting.service";

describe("JobPostingService", () => {
  const jobPostingRepo = {
    create: jest.fn(),
    findByReferenceNumber: jest.fn(),
    findWizardDraft: jest.fn(),
    findByIdForCompanyWithCandidates: jest.fn(),
    save: jest.fn(),
  };
  const companyRepo = {};
  const jobSkillRepo = {};
  const jobSuccessMetricRepo = {};
  const jobScreeningQuestionRepo = {};
  const portalPostingOrchestrator = {
    distribute: jest.fn(),
  };
  const portalPostingRepo = {
    findByJob: jest.fn(),
    save: jest.fn(),
  };
  const googleIndexing = {
    notifyUpdated: jest.fn(),
    notifyDeleted: jest.fn(),
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
      portalPostingRepo as never,
      googleIndexing as never,
      txRunner as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jobPostingRepo.findByReferenceNumber.mockResolvedValue(null);
    jobPostingRepo.create.mockImplementation(async (data) => ({ id: 123, ...data }));
    jobPostingRepo.save.mockImplementation(async (draft) => draft);
    portalPostingOrchestrator.distribute.mockResolvedValue({
      attempted: 0,
      succeeded: 0,
      failed: 0,
    });
    portalPostingRepo.findByJob.mockResolvedValue([]);
    googleIndexing.notifyUpdated.mockResolvedValue({ ok: true });
    googleIndexing.notifyDeleted.mockResolvedValue({ ok: true });
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
      // The cost/abuse-sensitive invariant: test mode must never reach a channel.
      expect(portalPostingOrchestrator.distribute).not.toHaveBeenCalled();
    });

    it("distributes to channels on a live publish", async () => {
      jobPostingRepo.findWizardDraft.mockResolvedValue(publishableDraft());

      await service().publishDraft(45, 123, { testMode: false });

      expect(portalPostingOrchestrator.distribute).toHaveBeenCalledTimes(1);
    });

    it("sets a 60-day expiry on publish when none is set", async () => {
      jobPostingRepo.findWizardDraft.mockResolvedValue(publishableDraft());

      const result = await service().publishDraft(45, 123, { testMode: false });

      expect(result.expiryDate).toBeInstanceOf(Date);
    });

    it("passes the job (with its enabledPortalCodes) to distribute", async () => {
      jobPostingRepo.findWizardDraft.mockResolvedValue(
        publishableDraft({ enabledPortalCodes: ["gumtree"] }),
      );

      await service().publishDraft(45, 123, { testMode: false });

      expect(portalPostingOrchestrator.distribute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 123, enabledPortalCodes: ["gumtree"] }),
      );
    });
  });

  describe("close / pause de-index", () => {
    beforeEach(() => {
      jobPostingRepo.findByIdForCompanyWithCandidates.mockResolvedValue(
        publishableDraft({ status: JobPostingStatus.ACTIVE, referenceNumber: "JOB-ABC123" }),
      );
    });

    it("close() fires Indexing URL_DELETED and marks distribution rows UNPOSTED", async () => {
      portalPostingRepo.findByJob.mockResolvedValue([{ status: "posted" }]);

      await service().close(45, 123);

      expect(googleIndexing.notifyDeleted).toHaveBeenCalledWith(
        expect.stringContaining("/jobs/JOB-ABC123"),
      );
      expect(portalPostingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: "unposted" }),
      );
    });

    it("pause() also de-indexes the job", async () => {
      portalPostingRepo.findByJob.mockResolvedValue([]);

      await service().pause(45, 123);

      expect(googleIndexing.notifyDeleted).toHaveBeenCalledWith(
        expect.stringContaining("/jobs/JOB-ABC123"),
      );
    });
  });
});
