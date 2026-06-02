import { Test, TestingModule } from "@nestjs/testing";
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

  it("posts to the keyed endpoint with a ZA location and maps results", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalCount: 1,
        jobs: [
          {
            id: 555,
            title: "Pipe Fitter",
            location: "Secunda",
            snippet: "<b>Shutdown</b> contract",
            salary: "R30 000 - R45 000",
            type: "Full-time",
            link: "https://jooble.org/jdp/555",
            company: "Example Corp",
            updated: "2026-05-31T10:00:00Z",
          },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await service.searchJobs("test-api-key");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toBe("https://jooble.org/api/test-api-key");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.location).toBe("South Africa");

    expect(result.jobs).toHaveLength(1);
    const job = result.jobs[0];
    expect(job.id).toBe("555");
    expect(job.title).toBe("Pipe Fitter");
    expect(job.company).toBe("Example Corp");
    expect(job.locationDisplayName).toBe("Secunda");
    expect(job.salaryMin).toBe(30000);
    expect(job.salaryMax).toBe(45000);
    expect(job.redirectUrl).toBe("https://jooble.org/jdp/555");
    expect(job.description).not.toContain("<b>");
  });

  it("stops paginating on a short page", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobs: [{ id: 1, title: "A", link: "l1" }] }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await service.searchJobs("k");
    expect(result.jobs).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws on non-OK response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    }) as unknown as typeof fetch;

    await expect(service.searchJobs("k")).rejects.toThrow(/429/);
  });
});
