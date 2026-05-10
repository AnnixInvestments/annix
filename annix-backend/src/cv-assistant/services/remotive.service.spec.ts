import { Test, TestingModule } from "@nestjs/testing";
import { DateTime } from "../../lib/datetime";
import { RemotiveService } from "./remotive.service";

describe("RemotiveService", () => {
  let service: RemotiveService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RemotiveService],
    }).compile();
    service = module.get<RemotiveService>(RemotiveService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("calls Remotive without auth and maps results", async () => {
    const olderThan24h = DateTime.now().minus({ hours: 30 }).toISO();
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [
          {
            id: 999,
            url: "https://remotive.com/jobs/999",
            title: "Senior Backend Engineer",
            company_name: "Example Corp",
            category: "Software Development",
            job_type: "full_time",
            publication_date: olderThan24h,
            candidate_required_location: "Worldwide",
            salary: "$80,000 - $120,000",
            description: "Backend role",
          },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await service.searchJobs({ category: "software-dev" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("remotive.com/api/remote-jobs");
    expect(calledUrl).toContain("category=software-dev");

    expect(result.jobs).toHaveLength(1);
    const job = result.jobs[0];
    expect(job.id).toBe("999");
    expect(job.title).toBe("Senior Backend Engineer");
    expect(job.company).toBe("Example Corp");
    expect(job.locationDisplayName).toBe("Worldwide");
    expect(job.salaryMin).toBe(80000);
    expect(job.salaryMax).toBe(120000);
    expect(job.redirectUrl).toBe("https://remotive.com/jobs/999");
  });

  it("filters out jobs published within last 24 hours", async () => {
    const recent = DateTime.now().minus({ hours: 1 }).toISO();
    const old = DateTime.now().minus({ days: 5 }).toISO();
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [
          { id: 1, title: "Recent role", publication_date: recent },
          { id: 2, title: "Old role", publication_date: old },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await service.searchJobs();
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].id).toBe("2");
  });

  it("throws on non-OK response", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "service unavailable",
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(service.searchJobs()).rejects.toThrow(/503/);
  });

  it("estimateExpiry returns 60 days from publication", () => {
    expect(service.estimateExpiry(null)).toBeNull();
    const expiry = service.estimateExpiry("2026-04-01T00:00:00Z");
    expect(expiry).not.toBeNull();
  });
});
