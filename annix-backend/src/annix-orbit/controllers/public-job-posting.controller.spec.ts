import type { PublicJobPostingDto } from "../services/job-posting.service";
import { PublicJobPostingController } from "./public-job-posting.controller";

describe("PublicJobPostingController jobs.xml", () => {
  const dto = {
    referenceNumber: "JOB-ABC123",
    title: "Senior Engineer",
    description: "Build things",
    location: "Cape Town",
    province: "Western Cape",
    employmentType: "full_time",
    salaryMin: 50000,
    salaryMax: 80000,
    salaryCurrency: "ZAR",
    requiredSkills: [],
    requiredEducation: null,
    requiredCertifications: [],
    minExperienceYears: 5,
    responseTimelineDays: 14,
    applyByEmail: "jobs@annix.co.za",
    postedAt: new Date("2026-07-01T00:00:00.000Z"),
    validThrough: "2026-08-30T00:00:00.000Z",
    companyName: "Acme",
  } as unknown as PublicJobPostingDto;

  const service = { listActiveForFeed: jest.fn() };
  const controller = () => new PublicJobPostingController(service as never);

  const render = async (jobs: PublicJobPostingDto[]): Promise<string> => {
    service.listActiveForFeed.mockResolvedValue(jobs);
    let sent = "";
    await controller().jobsFeed({
      send: (xml: string) => {
        sent = xml;
      },
    } as never);
    return sent;
  };

  it("renders a well-formed feed with expiration, email and the canonical URL", async () => {
    const xml = await render([dto]);

    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(xml).toContain("<referencenumber>JOB-ABC123</referencenumber>");
    expect(xml).toContain("<expirationdate>2026-08-30T00:00:00.000Z</expirationdate>");
    expect(xml).toContain("<email>jobs@annix.co.za</email>");
    expect(xml).toContain("/jobs/JOB-ABC123");
    expect(xml).toContain("<country>South Africa</country>");
    expect(xml).toContain("<jobtype>fulltime</jobtype>");
  });

  it("uses 'Confidential employer' when no company name is present", async () => {
    const xml = await render([{ ...dto, companyName: null }]);
    expect(xml).toContain("Confidential employer");
  });
});
