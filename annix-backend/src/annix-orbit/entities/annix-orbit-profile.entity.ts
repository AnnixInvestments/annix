import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import type { OrbitBillingStatus } from "../lib/seeker-entitlement";
import type { NixGeneratedCv } from "../services/nix-prompts";
import type {
  EeConsentSource,
  EeDisabilityStatus,
  EeGender,
  EeNationalityStatus,
  EePopulationGroup,
  EePurpose,
} from "./annix-orbit-candidate-ee-attributes.entity";
import type { ExtractedCvData } from "./candidate.entity";

export enum AnnixOrbitUserType {
  COMPANY = "company",
  RECRUITER = "recruiter",
  INDIVIDUAL = "individual",
  STUDENT = "student",
}

export const SEEKER_AGE_GROUPS = [
  "under-18",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;

export type SeekerAgeGroup = (typeof SEEKER_AGE_GROUPS)[number];

export function isSeekerAgeGroup(value: string): value is SeekerAgeGroup {
  return (SEEKER_AGE_GROUPS as readonly string[]).includes(value);
}

export const ORBIT_RECRUITER_ROLES = ["owner", "manager", "recruiter", "assistant"] as const;
export type AnnixOrbitRecruiterRole = (typeof ORBIT_RECRUITER_ROLES)[number];

export interface AnnixOrbitProfileEeDisclosure {
  populationGroup: EePopulationGroup;
  gender: EeGender;
  disabilityStatus: EeDisabilityStatus;
  requiresAccommodation: boolean;
  accommodationNotes: string | null;
  nationalityStatus: EeNationalityStatus;
  purposes: EePurpose[];
  consentTextVersionId: number;
  consentGrantedAt: Date;
  consentSource: EeConsentSource;
  updatedAt: Date;
}

export type IdentityVerificationStatus =
  | "processing"
  | "ai-checked"
  | "review"
  | "mismatch"
  | "verified-dha"
  | "failed";

export interface IdentityVerification {
  status: IdentityVerificationStatus;
  verdict: "verified" | "review" | "mismatch" | null;
  confidence: number | null;
  reasoning: string | null;
  documentType: string | null;
  surname: string | null;
  givenNames: string[];
  // Kept (not just hashed) because the phase-2 DHA register check needs the
  // raw 13-digit number. Treat as POPIA special personal information.
  idNumber: string | null;
  dateOfBirth: string | null;
  documentExpiry: string | null;
  // Raw image path while it is still retained; null once deleted.
  documentFilePath: string | null;
  documentHash: string | null;
  checkedAt: string | null;
  provider: "nix-ai" | null;
}

export class AnnixOrbitProfile {
  id: number;

  user: User;

  userId: number;

  company: Company | null;

  companyId: number | null;

  userType: AnnixOrbitUserType;

  recruiterRole: AnnixOrbitRecruiterRole | null;

  matchAlertThreshold: number;

  digestEnabled: boolean;

  pushEnabled: boolean;

  cvFilePath: string | null;

  // Optional seeker profile photo (a "this is me" picture). Stored in S3 like the
  // CV; shown to employers only when photoVisibleToEmployers is true.
  photoFilePath: string | null;

  photoVisibleToEmployers: boolean;

  rawCvText: string | null;

  // CV text extraction runs in the background after upload so the response is
  // fast: "processing" -> "completed" | "unreadable" (no text found) | "failed".
  cvExtractionStatus: string | null;

  // Seeker identity verification (issue #359 phase 1). The AI cross-checks the
  // uploaded ID/passport against the registration and CV names; "review" and
  // "mismatch" land in an admin queue rather than auto-blocking the seeker.
  // The raw document image is deleted once verified (POPIA minimisation) -
  // only the extracted fields and a content hash are kept.
  identityVerification: IdentityVerification | null;

  extractedCvData: ExtractedCvData | null;

  nixGeneratedCv: NixGeneratedCv | null;

  nixGeneratedCvAt: Date | null;

  cvUploadedAt: Date | null;

  careerScore: number | null;

  careerScoreGeneratedAt: Date | null;

  firstJobsViewedAt: Date | null;

  interviewPrepUsedAt: Date | null;

  profileUpdatedAfterSuggestionAt: Date | null;

  eeDisclosure: AnnixOrbitProfileEeDisclosure | null;

  deletionToken: string | null;

  deletionTokenExpires: Date | null;

  calendarFeedToken: string | null;

  calendarFeedTokenCreatedAt: Date | null;

  phone: string | null;

  interviewReminderEmail: boolean;

  interviewReminderSms: boolean;

  interviewReminderWhatsapp: boolean;

  dismissWarningAcknowledgedAt: Date | null;

  selectedTier: string | null;

  entitledTier: string;

  billingStatus: OrbitBillingStatus;

  paidUntil: Date | null;

  onboardingCompletedAt: Date | null;

  phoneType: string | null;

  ageGroup: string | null;

  appGuideSeen: boolean;

  createdAt: Date;

  updatedAt: Date;
}
