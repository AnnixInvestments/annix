import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { JoobleService } from "./jooble.service";

describe("JoobleService", () => {
  let service: JoobleService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JoobleService],
    }).compile();
    service = module.get<JoobleService>(JoobleService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("posts JSON body and maps results", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalCount: 1,
        jobs: [
          {
            id: 12345,
            title: "Boilermaker",
            location: "Kathu, Northern Cape",
            snippet: "Coded boilermaker required for shutdown",
            salary: "R30 000 - R45 000",
            source: "Indeed.co.za",
            type: "Full-time",
            link: "https://example.com/jooble/12345",
            company: "Example Mining",
            updated: "2026-05-09T08:00:00Z",
          },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await service.searchJobs("test-key", {
      keywords: "boilermaker",
      location: "South Africa",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe("https://jooble.org/api/test-key");
    expect(callArgs[1].method).toBe("POST");
    expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
    const parsedBody = JSON.parse(callArgs[1].body);
    expect(parsedBody.keywords).toBe("boilermaker");
    expect(parsedBody.location).toBe("South Africa");

    expect(result.totalCount).toBe(1);
    expect(result.jobs).toHaveLength(1);
    const job = result.jobs[0];
    expect(job.id).toBe("12345");
    expect(job.title).toBe("Boilermaker");
    expect(job.company).toBe("Example Mining");
    expect(job.locationDisplayName).toBe("Kathu, Northern Cape");
    expect(job.salaryMin).toBe(30000);
    expect(job.salaryMax).toBe(45000);
    expect(job.redirectUrl).toBe("https://example.com/jooble/12345");
    expect(job.created).not.toBeNull();
  });

  it("throws on non-OK response with status code", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(service.searchJobs("bad-key")).rejects.toThrow(/401/);
  });

  it("returns empty list when API returns no jobs", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ totalCount: 0, jobs: [] }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await service.searchJobs("test-key");
    expect(result.jobs).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it("estimateExpiry returns null for invalid input and 30 days for valid", () => {
    expect(service.estimateExpiry(null)).toBeNull();
    expect(service.estimateExpiry("not-a-date")).toBeNull();
    const expiry = service.estimateExpiry("2026-05-01T00:00:00Z");
    expect(expiry).not.toBeNull();
    if (expiry) {
      const expected = fromISO("2026-05-31T00:00:00Z").toMillis();
      expect(Math.abs(expiry.getTime() - expected)).toBeLessThan(1000);
    }
  });
});
