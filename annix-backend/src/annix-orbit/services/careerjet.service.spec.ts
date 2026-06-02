import { Test, TestingModule } from "@nestjs/testing";
import { CareerjetService } from "./careerjet.service";

describe("CareerjetService", () => {
  let service: CareerjetService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CareerjetService],
    }).compile();
    service = module.get<CareerjetService>(CareerjetService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("sends Basic auth with the affiliate id and maps results", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "JOBS",
        hits: 1,
        pages: 1,
        jobs: [
          {
            title: "Boilermaker",
            company: "Example Corp",
            date: "2026-05-30T00:00:00Z",
            description: "<p>Coded welding role</p>",
            locations: "Johannesburg",
            salary_min: 25000,
            salary_max: 35000,
            url: "https://www.careerjet.co.za/jobad/abc123",
          },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await service.searchJobs("AFFID123");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("search.api.careerjet.net/v4/query");
    expect(calledUrl).toContain("locale_code=en_ZA");
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("AFFID123:").toString("base64")}`);

    expect(result.jobs).toHaveLength(1);
    const job = result.jobs[0];
    expect(job.title).toBe("Boilermaker");
    expect(job.company).toBe("Example Corp");
    expect(job.locationDisplayName).toBe("Johannesburg");
    expect(job.salaryMin).toBe(25000);
    expect(job.salaryMax).toBe(35000);
    expect(job.redirectUrl).toBe("https://www.careerjet.co.za/jobad/abc123");
    expect(job.description).not.toContain("<p>");
    expect(job.id).toHaveLength(32);
  });

  it("derives a stable id from the job url", async () => {
    const payload = {
      ok: true,
      json: async () => ({
        jobs: [{ title: "Rigger", url: "https://www.careerjet.co.za/jobad/xyz" }],
      }),
    };
    global.fetch = jest.fn().mockResolvedValue(payload) as unknown as typeof fetch;
    const first = (await service.searchJobs("AFF")).jobs[0].id;
    global.fetch = jest.fn().mockResolvedValue(payload) as unknown as typeof fetch;
    const second = (await service.searchJobs("AFF")).jobs[0].id;
    expect(first).toBe(second);
  });

  it("throws on non-OK response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    }) as unknown as typeof fetch;

    await expect(service.searchJobs("BAD")).rejects.toThrow(/401/);
  });
});
