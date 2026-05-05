import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Candidate } from "./candidate.entity";
import { CvAssistantEeConsentTextVersion } from "./cv-assistant-ee-consent-text-version.entity";

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
}

export type EePurpose = "ee_reporting" | "fairness_monitoring";

@Entity("cv_assistant_candidate_ee_attributes")
export class CvAssistantCandidateEeAttributes {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Candidate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "candidate_id" })
  candidate: Candidate;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "population_group", type: "varchar", length: 30 })
  populationGroup: EePopulationGroup;

  @Column({ type: "varchar", length: 20 })
  gender: EeGender;

  @Column({ name: "disability_status", type: "varchar", length: 20 })
  disabilityStatus: EeDisabilityStatus;

  @Column({ name: "requires_accommodation", type: "boolean", default: false })
  requiresAccommodation: boolean;

  @Column({ name: "accommodation_notes", type: "text", nullable: true })
  accommodationNotes: string | null;

  @Column({ name: "nationality_status", type: "varchar", length: 30 })
  nationalityStatus: EeNationalityStatus;

  @ManyToOne(() => CvAssistantEeConsentTextVersion)
  @JoinColumn({ name: "consent_text_version_id" })
  consentTextVersion: CvAssistantEeConsentTextVersion;

  @Column({ name: "consent_text_version_id" })
  consentTextVersionId: number;

  @Column({ name: "consent_granted_at", type: "timestamptz" })
  consentGrantedAt: Date;

  @Column({ name: "consent_source", type: "varchar", length: 30 })
  consentSource: EeConsentSource;

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  purposes: EePurpose[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;
}
