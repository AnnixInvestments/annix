import { randomUUID } from "node:crypto";
import { portalForCode } from "@annix/product-data/portals";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EmailService } from "../../../email/email.service";
import { JobPosting } from "../../entities/job-posting.entity";
import { PortalAdapter, PortalCostTier, PortalPostingResult } from "../portal-adapter.interface";
import { PortalAdapterRegistry } from "../portal-adapter-registry.service";

const GUMTREE_SUBMISSION_EMAIL = "listings@gumtree.co.za";

@Injectable()
export class GumtreePortalAdapter implements PortalAdapter, OnModuleInit {
  private readonly logger = new Logger(GumtreePortalAdapter.name);

  readonly portalCode = "gumtree";
  readonly displayName = "Gumtree";
  readonly costTier: PortalCostTier = "free";

  constructor(
    private readonly registry: PortalAdapterRegistry,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async post(jobPosting: JobPosting): Promise<PortalPostingResult> {
    this.logger.warn(
      "Gumtree.co.za does not currently expose a programmatic 'post via email' workflow; this adapter sends a notification email to the public listings inbox and Annix staff complete the actual posting manually.",
    );

    const subject = this.subjectFor(jobPosting);
    const text = this.plainTextBody(jobPosting);
    const html = this.htmlBody(jobPosting);

    try {
      const sent = await this.emailService.sendEmail({
        to: GUMTREE_SUBMISSION_EMAIL,
        subject,
        text,
        html,
        isTransactional: true,
      });

      if (!sent) {
        return {
          success: false,
          error: "EmailService returned false when sending Gumtree submission email.",
        };
      }

      return {
        success: true,
        portalJobId: randomUUID(),
        portalUrl: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send Gumtree submission email: ${message}`);
      return { success: false, error: message };
    }
  }

  private subjectFor(jobPosting: JobPosting): string {
    const ref = jobPosting.referenceNumber ?? `JP-${jobPosting.id}`;
    const location = jobPosting.location ? ` (${jobPosting.location})` : "";
    return `Job listing submission: ${jobPosting.title}${location} — Ref ${ref}`;
  }

  private publicJobUrl(jobPosting: JobPosting): string | null {
    if (!jobPosting.referenceNumber) return null;
    const portal = portalForCode("cv-assistant");
    return `https://${portal.prodHost}/jobs/${jobPosting.referenceNumber}`;
  }

  private plainTextBody(jobPosting: JobPosting): string {
    const url = this.publicJobUrl(jobPosting);
    const lines = [
      `Title: ${jobPosting.title}`,
      jobPosting.location ? `Location: ${jobPosting.location}` : null,
      jobPosting.province ? `Province: ${jobPosting.province}` : null,
      jobPosting.employmentType ? `Type: ${jobPosting.employmentType}` : null,
      this.salaryLine(jobPosting),
      jobPosting.requiredSkills?.length ? `Skills: ${jobPosting.requiredSkills.join(", ")}` : null,
      jobPosting.applyByEmail ? `Apply by email: ${jobPosting.applyByEmail}` : null,
      "",
      "Description:",
      jobPosting.description ?? "(no description provided)",
      "",
      url ? `Full listing: ${url}` : null,
    ];
    return lines.filter((line): line is string => line !== null).join("\n");
  }

  private htmlBody(jobPosting: JobPosting): string {
    const url = this.publicJobUrl(jobPosting);
    const safeDescription = (jobPosting.description ?? "(no description provided)").replace(
      /\n/g,
      "<br />",
    );
    const skills = jobPosting.requiredSkills?.length
      ? `<p><strong>Skills:</strong> ${jobPosting.requiredSkills.join(", ")}</p>`
      : "";
    const salary = this.salaryLine(jobPosting);
    return `
      <h2>${jobPosting.title}</h2>
      ${jobPosting.location ? `<p><strong>Location:</strong> ${jobPosting.location}</p>` : ""}
      ${jobPosting.province ? `<p><strong>Province:</strong> ${jobPosting.province}</p>` : ""}
      ${jobPosting.employmentType ? `<p><strong>Type:</strong> ${jobPosting.employmentType}</p>` : ""}
      ${salary ? `<p><strong>${salary}</strong></p>` : ""}
      ${skills}
      <p>${safeDescription}</p>
      ${jobPosting.applyByEmail ? `<p><strong>Apply by email:</strong> ${jobPosting.applyByEmail}</p>` : ""}
      ${url ? `<p><a href="${url}">View full listing on CV Assistant</a></p>` : ""}
    `;
  }

  private salaryLine(jobPosting: JobPosting): string | null {
    if (jobPosting.salaryMin == null && jobPosting.salaryMax == null) return null;
    const currency = jobPosting.salaryCurrency || "ZAR";
    if (jobPosting.salaryMin != null && jobPosting.salaryMax != null) {
      return `Salary: ${currency} ${jobPosting.salaryMin} - ${jobPosting.salaryMax}`;
    }
    if (jobPosting.salaryMin != null) {
      return `Salary from: ${currency} ${jobPosting.salaryMin}`;
    }
    return `Salary up to: ${currency} ${jobPosting.salaryMax}`;
  }
}
