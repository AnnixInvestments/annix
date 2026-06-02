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
    expect(headers.Referer).toBe("https://annix.co.za");

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
    expect(calledUrl).not.toContain("location=");
  });

  it("parses the RFC-2822 date format Careerjet returns", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [
          {
            title: "Welder",
            url: "https://www.careerjet.co.za/jobad/d1",
            date: "Wed,15 Nov 2025 19:13:43 GMT",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const job = (await service.searchJobs("AFF")).jobs[0];
    expect(job.created).not.toBeNull();
    expect(job.created).toContain("2025-11-15");
  });

  it("stops when the API enters location mode", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "LOCATIONS", locations: [], jobs: [] }),
    }) as unknown as typeof fetch;

    const result = await service.searchJobs("AFF");
    expect(result.jobs).toHaveLength(0);
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
