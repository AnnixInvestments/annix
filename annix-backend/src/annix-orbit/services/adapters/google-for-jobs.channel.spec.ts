import { GoogleForJobsChannel } from "./google-for-jobs.channel";

describe("GoogleForJobsChannel", () => {
  const registry = { register: jest.fn() };
  const indexing = { notifyUpdated: jest.fn(), notifyDeleted: jest.fn() };

  const build = () => new GoogleForJobsChannel(registry as never, indexing as never);

  beforeEach(() => {
    jest.clearAllMocks();
    indexing.notifyUpdated.mockResolvedValue({ ok: true });
  });

  it("pings the Indexing API and records IN_FEED", async () => {
    const result = await build().post({ referenceNumber: "JOB-ABC123" } as never);

    expect(indexing.notifyUpdated).toHaveBeenCalledWith(
      expect.stringContaining("/jobs/JOB-ABC123"),
    );
    expect(result.success).toBe(true);
    expect(result.outcome).toBe("in_feed");
  });

  it("fails cleanly (no ping) when the job has no reference number", async () => {
    const result = await build().post({ referenceNumber: null } as never);

    expect(result.success).toBe(false);
    expect(indexing.notifyUpdated).not.toHaveBeenCalled();
  });
});
