import { AnnixOrbitEeConsentTextVersion } from "./annix-orbit-ee-consent-text-version.entity";
import { Candidate } from "./candidate.entity";

export enum EePopulationGroup {
  AFRICAN_BLACK = "african_black",
  COLOURED = "coloured",
  INDIAN = "indian",
  WHITE = "white",
  PREFER_NOT_TO_SAY = "prefer_not_to_say",
}

export enum EeGender {
  FEMALE = "female",
  MALE = "male",
  OTHER = "other",
  PREFER_NOT_TO_SAY = "prefer_not_to_say",
}

export enum EeDisabilityStatus {
  YES = "yes",
  NO = "no",
  PREFER_NOT_TO_SAY = "prefer_not_to_say",
}

export enum EeNationalityStatus {
  SA_CITIZEN = "sa_citizen",
  SA_PERMANENT_RESIDENT = "sa_permanent_resident",
  FOREIGN_NATIONAL = "foreign_national",
  PREFER_NOT_TO_SAY = "prefer_not_to_say",
}

export enum EeConsentSource {
  CANDIDATE_PORTAL = "candidate_portal",
  POST_APPLICATION_EMAIL = "post_application_email",
  HR_RECORDED = "hr_recorded",
  REGISTRATION = "registration",
  SEEKER_PORTAL = "seeker_portal",
}

export type EePurpose = "ee_reporting" | "fairness_monitoring";

export class AnnixOrbitCandidateEeAttributes {
  id: number;

  candidate: Candidate;

  candidateId: number;

  populationGroup: EePopulationGroup;

  gender: EeGender;

  disabilityStatus: EeDisabilityStatus;

  requiresAccommodation: boolean;

  accommodationNotes: string | null;

  nationalityStatus: EeNationalityStatus;

  consentTextVersion: AnnixOrbitEeConsentTextVersion;

  consentTextVersionId: number;

  consentGrantedAt: Date;

  consentSource: EeConsentSource;

  purposes: EePurpose[];

  createdAt: Date;

  deletedAt: Date | null;
}
