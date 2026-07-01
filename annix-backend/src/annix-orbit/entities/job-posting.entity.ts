import { AnnixOrbitCompany } from "./annix-orbit-company.entity";
import { Candidate } from "./candidate.entity";
import { JobScreeningQuestion } from "./job-screening-question.entity";
import { JobSkill } from "./job-skill.entity";
import { JobSuccessMetric } from "./job-success-metric.entity";

export enum JobPostingStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  CLOSED = "closed",
  /** Auto-closed after passing its expiryDate; de-indexed from external surfaces. */
  EXPIRED = "expired",
}

export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACT = "contract",
  TEMPORARY = "temporary",
  INTERNSHIP = "internship",
  LEARNERSHIP = "learnership",
}

export enum WorkMode {
  ON_SITE = "on_site",
  HYBRID = "hybrid",
  REMOTE = "remote",
}

export enum OccupationalLevel {
  TOP_MANAGEMENT = "top_management",
  SENIOR_MANAGEMENT = "senior_management",
  PROFESSIONALLY_QUALIFIED = "professionally_qualified",
  SKILLED = "skilled",
  SEMI_SKILLED = "semi_skilled",
  UNSKILLED = "unskilled",
}

export class JobPosting {
  id: number;

  title: string;

  description: string | null;

  requiredSkills: string[];

  minExperienceYears: number | null;

  requiredEducation: string | null;

  requiredCertifications: string[];

  emailSubjectPattern: string | null;

  autoRejectEnabled: boolean;

  autoRejectThreshold: number;

  autoAcceptThreshold: number;

  status: JobPostingStatus;

  referenceNumber: string | null;

  responseTimelineDays: number;

  location: string | null;

  province: string | null;

  employmentType: EmploymentType | null;

  salaryMin: number | null;

  salaryMax: number | null;

  salaryCurrency: string;

  applyByEmail: string | null;

  activatedAt: Date | null;

  /** When the advert auto-expires (drives schema.org validThrough + de-index). */
  expiryDate: Date | null;

  enabledPortalCodes: string[];

  testMode: boolean;

  normalizedTitle: string | null;

  industry: string | null;

  department: string | null;

  seniorityLevel: string | null;

  workMode: WorkMode | null;

  occupationalLevel: OccupationalLevel | null;

  companyContext: string | null;

  mainPurpose: string | null;

  commissionStructure: string | null;

  benefits: string[];

  qualityScore: number;

  inclusivityScore: number;

  nixSummary: Record<string, unknown> | null;

  skills: JobSkill[];

  successMetrics: JobSuccessMetric[];

  screeningQuestions: JobScreeningQuestion[];

  company: AnnixOrbitCompany;

  companyId: number;

  candidates: Candidate[];

  createdAt: Date;

  updatedAt: Date;
}
