import { JobPostingPortalStatus } from "../entities/job-posting-portal-posting.entity";
import { PortalAdapter, PortalPostingResult } from "./portal-adapter.interface";
import { PortalPostingOrchestrator } from "./portal-posting-orchestrator.service";

describe("PortalPostingOrchestrator", () => {
  const registry = { defaultAutoChannels: jest.fn(), byCode: jest.fn(), all: jest.fn() };
  const portalPostingRepo = { findByJobAndPortal: jest.fn(), create: jest.fn(), save: jest.fn() };
  const costGuard = { wouldExceedBudget: jest.fn() };
  const rateLimiter = { acquire: jest.fn() };

  const orchestrator = () =>
    new PortalPostingOrchestrator(
      registry as never,
      portalPostingRepo as never,
      costGuard as never,
      rateLimiter as never,
    );

  const channel = (
    overrides: Partial<PortalAdapter> & { post: PortalAdapter["post"] },
  ): PortalAdapter => ({
    portalCode: "gumtree",
    displayName: "Gumtree",
    costTier: "free",
    postingMode: "api",
    ...overrides,
  });

  const job = { id: 123, enabledPortalCodes: [] as string[] } as never;

  // Realistic in-memory row store so findByJobAndPortal returns pre-created rows.
  let store: Map<string, Record<string, unknown>>;
  beforeEach(() => {
    jest.clearAllMocks();
    store = new Map();
    portalPostingRepo.findByJobAndPortal.mockImplementation(
      async (jobId: number, code: string) => store.get(`${jobId}:${code}`) ?? null,
    );
    portalPostingRepo.create.mockImplementation(async (data: Record<string, unknown>) => {
      const row = { retryCount: 0, ...data };
      store.set(`${data.jobPostingId}:${data.portalCode}`, row);
      return row;
    });
    portalPostingRepo.save.mockImplementation(async (row: Record<string, unknown>) => row);
    registry.defaultAutoChannels.mockReturnValue([]);
    costGuard.wouldExceedBudget.mockResolvedValue(false);
    rateLimiter.acquire.mockResolvedValue(undefined);
  });

  const run = (result: PortalPostingResult) =>
    orchestrator().runSingleAdapter(job, channel({ post: jest.fn().mockResolvedValue(result) }));

  describe("runSingleAdapter status mapping", () => {
    it("submitted → SUBMITTED, never a fabricated external id", async () => {
      await run({ success: true, outcome: "submitted", requiresManualConfirmation: true });
      const row = store.get("123:gumtree");
      expect(row?.status).toBe(JobPostingPortalStatus.SUBMITTED);
      expect(row?.portalJobId ?? null).toBeNull();
      expect(row?.postedAt).toBeNull();
    });

    it("in_feed → IN_FEED", async () => {
      await run({ success: true, outcome: "in_feed", portalUrl: "https://cv.test/jobs/X" });
      expect(store.get("123:gumtree")?.status).toBe(JobPostingPortalStatus.IN_FEED);
    });

    it("posted → POSTED with id and postedAt", async () => {
      await run({ success: true, portalJobId: "ext-9" });
      const row = store.get("123:gumtree");
      expect(row?.status).toBe(JobPostingPortalStatus.POSTED);
      expect(row?.portalJobId).toBe("ext-9");
      expect(row?.postedAt).toBeInstanceOf(Date);
    });

    it("failure → FAILED with a scheduled retry", async () => {
      await run({ success: false, error: "boom" });
      const row = store.get("123:gumtree");
      expect(row?.status).toBe(JobPostingPortalStatus.FAILED);
      expect(row?.nextRetryAt).toBeInstanceOf(Date);
    });
  });

  describe("distribute", () => {
    it("pre-creates PENDING rows for every target, dispatches feed/api, leaves assisted PENDING", async () => {
      const feedPost = jest.fn().mockResolvedValue({ success: true, outcome: "in_feed" });
      const assistedPost = jest.fn();
      const feed = channel({ portalCode: "google-for-jobs", postingMode: "feed", post: feedPost });
      const assisted = channel({
        portalCode: "jobvine",
        postingMode: "assisted",
        post: assistedPost,
      });
      registry.defaultAutoChannels.mockReturnValue([feed, assisted]);
      registry.byCode.mockImplementation((code: string) =>
        code === "google-for-jobs" ? feed : code === "jobvine" ? assisted : null,
      );

      const summary = await orchestrator().distribute(job);

      expect(feedPost).toHaveBeenCalledTimes(1);
      expect(assistedPost).not.toHaveBeenCalled();
      expect(store.get("123:jobvine")?.status).toBe(JobPostingPortalStatus.PENDING);
      expect(store.get("123:google-for-jobs")?.status).toBe(JobPostingPortalStatus.IN_FEED);
      expect(summary.attempted).toBe(1);
    });

    it("records SKIPPED(unknown_channel) for an unregistered enabled code", async () => {
      registry.defaultAutoChannels.mockReturnValue([]);
      registry.byCode.mockReturnValue(null);
      const jobWithBad = { id: 123, enabledPortalCodes: ["does-not-exist"] } as never;

      await orchestrator().distribute(jobWithBad);

      const row = store.get("123:does-not-exist");
      expect(row?.status).toBe(JobPostingPortalStatus.SKIPPED);
      expect(row?.skipReason).toBe("unknown_channel");
    });

    it("never dispatches or rows an unavailable channel", async () => {
      const post = jest.fn();
      const unavailable = channel({ portalCode: "indeed", available: false, post });
      registry.defaultAutoChannels.mockReturnValue([]);
      registry.byCode.mockReturnValue(unavailable);
      const j = { id: 123, enabledPortalCodes: ["indeed"] } as never;

      const summary = await orchestrator().distribute(j);

      expect(post).not.toHaveBeenCalled();
      expect(store.size).toBe(0);
      expect(summary.attempted).toBe(0);
    });

    it("records SKIPPED('budget') and never dispatches a paid channel over budget", async () => {
      const post = jest.fn();
      const paid = channel({ portalCode: "indeed", costTier: "paid", available: true, post });
      registry.defaultAutoChannels.mockReturnValue([]);
      registry.byCode.mockReturnValue(paid);
      costGuard.wouldExceedBudget.mockResolvedValue(true);
      const j = { id: 123, companyId: 7, enabledPortalCodes: ["indeed"] } as never;

      const summary = await orchestrator().distribute(j);

      expect(costGuard.wouldExceedBudget).toHaveBeenCalledWith(7, "indeed");
      expect(post).not.toHaveBeenCalled();
      expect(store.get("123:indeed")?.status).toBe(JobPostingPortalStatus.SKIPPED);
      expect(store.get("123:indeed")?.skipReason).toBe("budget");
      expect(summary.attempted).toBe(0);
    });

    it("rate-limits and records the cost of a paid channel within budget", async () => {
      const post = jest.fn().mockResolvedValue({ success: true, portalJobId: "ext-1", cost: 7 });
      const paid = channel({ portalCode: "indeed", costTier: "paid", available: true, post });
      registry.defaultAutoChannels.mockReturnValue([]);
      registry.byCode.mockReturnValue(paid);
      costGuard.wouldExceedBudget.mockResolvedValue(false);
      const j = { id: 123, companyId: 7, enabledPortalCodes: ["indeed"] } as never;

      await orchestrator().distribute(j);

      expect(rateLimiter.acquire).toHaveBeenCalledWith("indeed:7", expect.any(Object));
      const row = store.get("123:indeed");
      expect(row?.status).toBe(JobPostingPortalStatus.POSTED);
      expect(row?.cost).toBe(7);
    });
  });
});
