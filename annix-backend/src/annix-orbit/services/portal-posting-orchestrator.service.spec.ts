import { JobPostingPortalStatus } from "../entities/job-posting-portal-posting.entity";
import { PortalAdapter, PortalPostingResult } from "./portal-adapter.interface";
import { PortalPostingOrchestrator } from "./portal-posting-orchestrator.service";

describe("PortalPostingOrchestrator", () => {
  const registry = {
    freeAdapters: jest.fn(),
    byCode: jest.fn(),
    all: jest.fn(),
  };
  const portalPostingRepo = {
    findByJobAndPortal: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const orchestrator = () =>
    new PortalPostingOrchestrator(registry as never, portalPostingRepo as never);

  const job = { id: 123, enabledPortalCodes: [] } as never;

  const adapter = (
    overrides: Partial<PortalAdapter> & { post: PortalAdapter["post"] },
  ): PortalAdapter => ({
    portalCode: "gumtree",
    displayName: "Gumtree",
    costTier: "free",
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    portalPostingRepo.findByJobAndPortal.mockResolvedValue(null);
    portalPostingRepo.create.mockImplementation(async (data) => ({
      retryCount: 0,
      ...data,
    }));
    portalPostingRepo.save.mockImplementation(async (record) => record);
  });

  it("records SUBMITTED (never POSTED) and no external id for a manual-handoff success", async () => {
    const result: PortalPostingResult = {
      success: true,
      outcome: "submitted",
      requiresManualConfirmation: true,
      portalUrl: "https://example.test/jobs/JOB-ABC123",
    };
    const saved = await orchestrator().runSingleAdapter(
      job,
      adapter({ post: jest.fn().mockResolvedValue(result) }),
    );

    const record = portalPostingRepo.save.mock.calls[0][0];
    expect(record.status).toBe(JobPostingPortalStatus.SUBMITTED);
    expect(record.portalJobId ?? null).toBeNull();
    expect(record.postedAt).toBeNull();
    expect(saved.success).toBe(true);
  });

  it("records POSTED with the external id for a genuine posting success", async () => {
    const result: PortalPostingResult = {
      success: true,
      portalJobId: "ext-999",
      portalUrl: "https://board.test/999",
    };
    await orchestrator().runSingleAdapter(
      job,
      adapter({ post: jest.fn().mockResolvedValue(result) }),
    );

    const record = portalPostingRepo.save.mock.calls[0][0];
    expect(record.status).toBe(JobPostingPortalStatus.POSTED);
    expect(record.portalJobId).toBe("ext-999");
    expect(record.postedAt).toBeInstanceOf(Date);
  });

  it("never dispatches to an adapter that is not yet available", async () => {
    const post = jest.fn();
    registry.byCode.mockReturnValue(adapter({ portalCode: "indeed", available: false, post }));

    const summary = await orchestrator().postToSelectedAdapters(job, ["indeed"]);

    expect(post).not.toHaveBeenCalled();
    expect(summary.attempted).toBe(0);
    expect(portalPostingRepo.create).not.toHaveBeenCalled();
  });
});
