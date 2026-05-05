import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { JobPosting } from "../../entities/job-posting.entity";
import {
  AssistedPostingInstructions,
  PortalAdapter,
  PortalCostTier,
  PortalPostingResult,
} from "../portal-adapter.interface";
import { PortalAdapterRegistry } from "../portal-adapter-registry.service";

const PUBLIC_JOB_HOST = "cv-assistant.annix.co.za";
const APPLICATIONS_INBOX = "jobs@annix.co.za";

interface AssistedPortalDef {
  code: string;
  displayName: string;
  postUrl: string;
  notes: string;
}

const ASSISTED_PORTALS: AssistedPortalDef[] = [
  {
    code: "jobvine",
    displayName: "Jobvine",
    postUrl: "https://jobvine.co.za/employer/post-job",
    notes:
      "Free SA-focused board with ML matching. Free company registration, then post the advert via the dashboard.",
  },
  {
    code: "freerecruit",
    displayName: "Freerecruit",
    postUrl: "https://www.freerecruit.co.za/post-jobs-for-free/",
    notes:
      "Fully free unlimited postings. Mobile-friendly. Register once, then paste each advert in their post-job form.",
  },
  {
    code: "jobisjob",
    displayName: "JobisJob",
    postUrl: "https://www.jobisjob.co.za/employer/post-job",
    notes:
      "Aggregator-style free postings. May also pick up our /cv-assistant/public/jobs.xml feed automatically.",
  },
  {
    code: "compujobs",
    displayName: "CompuJobs",
    postUrl: "https://www.compujobs.co.za/employer/register",
    notes: "Free one-month unlimited postings tier for small recruiters. SA focus.",
  },
  {
    code: "bizcommunity",
    displayName: "Bizcommunity Jobs",
    postUrl: "https://www.bizcommunity.com/Jobs/PostAJob.aspx",
    notes: "Tied to business media — strong for marketing, media, comms, and exec roles.",
  },
  {
    code: "snaphunt",
    displayName: "Snaphunt",
    postUrl: "https://snaphunt.com/employer/job-posting",
    notes: "AI-matching board with auto-distribution including Google for Jobs. Modern web UI.",
  },
  {
    code: "virtual-staff-sa",
    displayName: "Virtual Staff SA",
    postUrl: "https://www.virtualstaffsa.com/post-a-job/",
    notes: "Free unlimited postings, focused on remote / virtual SA talent. Best for remote roles.",
  },
  {
    code: "africaonjobs",
    displayName: "AfricaOnJobs",
    postUrl: "https://www.africaonjobs.com/employer/post-job",
    notes: "Pan-African reach. Useful for cross-border roles or wider African talent pools.",
  },
  {
    code: "recruitmentpartner",
    displayName: "RecruitmentPartner",
    postUrl: "https://www.recruitmentpartner.co.za/employer/post-vacancy",
    notes: "Free SA postings + CV search tools.",
  },
  {
    code: "mustakbil",
    displayName: "Mustakbil",
    postUrl: "https://www.mustakbil.com/employers/post-job",
    notes: "Free + AI tools, international reach. Good for technical / IT roles.",
  },
];

@Injectable()
export class AssistedPortalAdapters implements OnModuleInit {
  private readonly logger = new Logger(AssistedPortalAdapters.name);

  constructor(private readonly registry: PortalAdapterRegistry) {}

  onModuleInit(): void {
    ASSISTED_PORTALS.forEach((def) => {
      this.registry.register(this.buildAdapter(def));
    });
  }

  private buildAdapter(def: AssistedPortalDef): PortalAdapter {
    return {
      portalCode: def.code,
      displayName: def.displayName,
      costTier: "assisted" as PortalCostTier,
      post: (_jobPosting: JobPosting): Promise<PortalPostingResult> => {
        return Promise.resolve({
          success: false,
          error: `${def.displayName} is assisted-posting only. Open the deep link, paste the generated copy, and mark it complete by hand.`,
        });
      },
      assistedInstructions: (jobPosting: JobPosting): AssistedPostingInstructions => {
        return buildInstructions(def, jobPosting);
      },
    };
  }
}

function buildInstructions(
  def: AssistedPortalDef,
  jobPosting: JobPosting,
): AssistedPostingInstructions {
  const refNumber = jobPosting.referenceNumber
    ? jobPosting.referenceNumber
    : `JOB-${jobPosting.id}`;
  const publicUrl = `https://${PUBLIC_JOB_HOST}/cv-assistant/jobs/${refNumber}`;
  const copyTitle = `${jobPosting.title} — Ref ${refNumber}`;
  const copyBody = bodyTemplate(jobPosting, publicUrl, refNumber);
  const copyContact = contactTemplate(jobPosting, refNumber);
  return {
    targetUrl: def.postUrl,
    copyTitle,
    copyBody,
    copyContact,
    notes: def.notes,
  };
}

function bodyTemplate(jobPosting: JobPosting, publicUrl: string, refNumber: string): string {
  const lines: (string | null)[] = [
    jobPosting.location ? `Location: ${jobPosting.location}` : null,
    jobPosting.province ? `Province: ${jobPosting.province}` : null,
    jobPosting.employmentType ? `Type: ${jobPosting.employmentType.replace(/_/g, " ")}` : null,
    salaryLine(jobPosting),
    jobPosting.minExperienceYears !== null
      ? `Minimum experience: ${jobPosting.minExperienceYears} years`
      : null,
    jobPosting.requiredEducation ? `Required education: ${jobPosting.requiredEducation}` : null,
    jobPosting.requiredSkills && jobPosting.requiredSkills.length > 0
      ? `Required skills: ${jobPosting.requiredSkills.join(", ")}`
      : null,
    jobPosting.requiredCertifications && jobPosting.requiredCertifications.length > 0
      ? `Required certifications: ${jobPosting.requiredCertifications.join(", ")}`
      : null,
    "",
    jobPosting.description ? jobPosting.description : "",
    "",
    `How to apply: email your CV to ${APPLICATIONS_INBOX} with subject line "Application for ${jobPosting.title} (${refNumber})".`,
    `Full listing: ${publicUrl}`,
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

function contactTemplate(jobPosting: JobPosting, refNumber: string): string {
  return `${APPLICATIONS_INBOX} (subject: Application for ${jobPosting.title} (${refNumber}))`;
}

function salaryLine(jobPosting: JobPosting): string | null {
  const min = jobPosting.salaryMin;
  const max = jobPosting.salaryMax;
  if (min === null && max === null) return null;
  const currency = jobPosting.salaryCurrency ? jobPosting.salaryCurrency : "ZAR";
  if (min !== null && max !== null) {
    return `Salary: ${currency} ${min} – ${max} per month`;
  }
  if (min !== null) {
    return `Salary from: ${currency} ${min} per month`;
  }
  return `Salary up to: ${currency} ${max} per month`;
}
