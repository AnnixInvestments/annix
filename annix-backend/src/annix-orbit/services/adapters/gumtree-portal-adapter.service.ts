import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../../../email/email.service";
import { JobPosting } from "../../entities/job-posting.entity";
import { orbitPublicJobUrl } from "../../lib/public-job-url";
import {
  PortalAdapter,
  PortalCostTier,
  PortalPostingMode,
  PortalPostingResult,
} from "../portal-adapter.interface";
import { PortalAdapterRegistry } from "../portal-adapter-registry.service";

// Placeholder addresses we must never silently email a real job posting to.
const PLACEHOLDER_SUBMISSION_EMAILS = new Set(["listings@example.com", ""]);

@Injectable()
export class GumtreePortalAdapter implements PortalAdapter, OnModuleInit {
  private readonly logger = new Logger(GumtreePortalAdapter.name);

  readonly portalCode = "gumtree";
  readonly displayName = "Gumtree";
  readonly costTier: PortalCostTier = "free";
  // Auto-submits by emailing the listings inbox (no user action), so it is an
  // automated channel even though a human completes the actual Gumtree posting.
  readonly postingMode: PortalPostingMode = "api";

  private submissionEmail: string | null = null;

  constructor(
    private readonly registry: PortalAdapterRegistry,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const configured = this.configService.get<string>("GUMTREE_LISTINGS_EMAIL")?.trim() ?? "";
    if (configured.length === 0 || PLACEHOLDER_SUBMISSION_EMAILS.has(configured.toLowerCase())) {
      // Fail loudly at startup rather than silently emailing a placeholder
      // inbox at posting time. The adapter stays registered but refuses to send.
      this.logger.error(
        "GUMTREE_LISTINGS_EMAIL is not configured (or is a placeholder). The Gumtree channel " +
          "will refuse to submit job postings until a real listings inbox is set.",
      );
      this.submissionEmail = null;
    } else {
      this.submissionEmail = configured;
    }
    this.registry.register(this);
  }

  async post(jobPosting: JobPosting): Promise<PortalPostingResult> {
    if (!this.submissionEmail) {
      return {
        success: false,
        error:
          "Gumtree listings inbox is not configured (GUMTREE_LISTINGS_EMAIL); refusing to send to a placeholder address.",
      };
    }

    // Gumtree exposes no programmatic posting API. This adapter emails the
    // configured listings inbox so a human completes the actual posting — so the
    // job is SUBMITTED for manual handling, never POSTED with an external id.
    this.logger.log(
      `Submitting job ${jobPosting.id} to the Gumtree listings inbox for manual posting.`,
    );

    const subject = this.subjectFor(jobPosting);
    const text = this.plainTextBody(jobPosting);
    const html = this.htmlBody(jobPosting);

    try {
      const sent = await this.emailService.sendEmail({
        to: this.submissionEmail,
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
        outcome: "submitted",
        requiresManualConfirmation: true,
        portalUrl: this.publicJobUrl(jobPosting),
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
    return orbitPublicJobUrl(jobPosting.referenceNumber);
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
      ${url ? `<p><a href="${url}">View full listing on Annix Orbit</a></p>` : ""}
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
