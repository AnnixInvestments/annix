import { Controller, Get, Header, NotFoundException, Param, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import type { PublicJobPostingDto } from "../services/job-posting.service";
import { JobPostingService } from "../services/job-posting.service";

const XML_EMPLOYMENT_TYPE: Record<string, string> = {
  full_time: "fulltime",
  part_time: "parttime",
  contract: "contract",
  temporary: "temporary",
  internship: "internship",
  learnership: "other",
};

const escapeXml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const cdata = (value: string | null | undefined): string => {
  if (!value) return "<![CDATA[]]>";
  const safe = value.replace(/]]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
};

@Controller("cv-assistant/public")
export class PublicJobPostingController {
  constructor(
    private readonly jobPostingService: JobPostingService,
    private readonly configService: ConfigService,
  ) {}

  @Get("job-postings/:referenceNumber")
  async byReferenceNumber(@Param("referenceNumber") referenceNumber: string) {
    const jobPosting = await this.jobPostingService.publicByReferenceNumber(referenceNumber);
    if (!jobPosting) {
      throw new NotFoundException("Job posting not found");
    }
    return jobPosting;
  }

  @Get("jobs.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  @Header("Cache-Control", "public, max-age=900, s-maxage=900")
  async jobsFeed(@Res() res: Response): Promise<void> {
    const jobs = await this.jobPostingService.listActiveForFeed();
    const baseUrl = this.frontendBaseUrl();
    const xml = this.renderFeed(jobs, baseUrl);
    res.send(xml);
  }

  private frontendBaseUrl(): string {
    const configured = this.configService.get<string>("FRONTEND_URL");
    if (configured) return configured.replace(/\/$/, "");
    return "https://cv-assistant.annix.co.za";
  }

  private renderFeed(jobs: PublicJobPostingDto[], baseUrl: string): string {
    const generatedAt = new Date().toISOString();
    const items = jobs.map((job) => this.renderJobNode(job, baseUrl)).join("\n");
    return `<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher>Annix CV Assistant</publisher>
  <publisherurl>${escapeXml(baseUrl)}</publisherurl>
  <lastBuildDate>${escapeXml(generatedAt)}</lastBuildDate>
${items}
</source>`;
  }

  private renderJobNode(job: PublicJobPostingDto, baseUrl: string): string {
    const url = `${baseUrl}/cv-assistant/jobs/${encodeURIComponent(job.referenceNumber)}`;
    const employmentTypeKey = job.employmentType;
    const jobType = employmentTypeKey ? XML_EMPLOYMENT_TYPE[employmentTypeKey] : null;
    const cityNode = job.location ? `    <city>${cdata(job.location)}</city>\n` : "";
    const stateNode = job.province ? `    <state>${cdata(job.province)}</state>\n` : "";
    const jobTypeNode = jobType ? `    <jobtype>${escapeXml(jobType)}</jobtype>\n` : "";
    const salaryParts = [
      job.salaryMin !== null ? job.salaryMin : null,
      job.salaryMax !== null ? job.salaryMax : null,
    ].filter((v) => v !== null);
    const salaryNode =
      salaryParts.length > 0
        ? `    <salary>${escapeXml(`${salaryParts.join(" - ")} ${job.salaryCurrency} per month`)}</salary>\n`
        : "";
    const expNode =
      job.minExperienceYears !== null
        ? `    <experience>${escapeXml(`${job.minExperienceYears}+ years`)}</experience>\n`
        : "";
    const postedAt =
      job.postedAt instanceof Date
        ? job.postedAt.toISOString()
        : new Date(job.postedAt).toISOString();
    const description = job.description ? job.description : job.title;

    return `  <job>
    <title>${cdata(job.title)}</title>
    <referencenumber>${escapeXml(job.referenceNumber)}</referencenumber>
    <date>${escapeXml(postedAt)}</date>
    <url>${escapeXml(url)}</url>
    <company>${cdata(job.companyName ? job.companyName : "Confidential employer")}</company>
${cityNode}${stateNode}    <country>South Africa</country>
${jobTypeNode}${salaryNode}${expNode}    <description>${cdata(description)}</description>
  </job>`;
  }
}
