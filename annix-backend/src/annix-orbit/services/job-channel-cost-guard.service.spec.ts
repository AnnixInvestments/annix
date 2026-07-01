import { JobChannelCostGuard } from "./job-channel-cost-guard.service";

describe("JobChannelCostGuard", () => {
  const config = { get: jest.fn() };
  const portalPostingRepo = { sumCostSince: jest.fn() };

  const guard = () => new JobChannelCostGuard(config as never, portalPostingRepo as never);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue(undefined);
    portalPostingRepo.sumCostSince.mockResolvedValue(0);
  });

  it("refuses a paid channel with no configured ceiling (fail-safe: never spend)", async () => {
    expect(await guard().wouldExceedBudget(7, "indeed")).toBe(true);
    expect(portalPostingRepo.sumCostSince).not.toHaveBeenCalled();
  });

  it("allows a paid post when projected spend is within the ceiling", async () => {
    config.get.mockReturnValue("100"); // JOB_CHANNEL_CEILING_INDEED
    portalPostingRepo.sumCostSince.mockResolvedValue(50); // 50 + 7 est = 57 <= 100

    expect(await guard().wouldExceedBudget(7, "indeed")).toBe(false);
  });

  it("refuses when projected spend would exceed the ceiling", async () => {
    config.get.mockReturnValue("100");
    portalPostingRepo.sumCostSince.mockResolvedValue(96); // 96 + 7 = 103 > 100

    expect(await guard().wouldExceedBudget(7, "indeed")).toBe(true);
  });
});
