import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
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

@Entity("cv_assistant_profiles")
@Index(["userId"], { unique: true })
export class AnnixOrbitProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: "company_id" })
  company: Company | null;

  @Column({ name: "company_id", nullable: true })
  companyId: number | null;

  @Column({ name: "user_type", type: "varchar", length: 20, default: AnnixOrbitUserType.COMPANY })
  userType: AnnixOrbitUserType;

  @Column({ name: "match_alert_threshold", type: "int", default: 80 })
  matchAlertThreshold: number;

  @Column({ name: "digest_enabled", type: "boolean", default: true })
  digestEnabled: boolean;

  @Column({ name: "push_enabled", type: "boolean", default: false })
  pushEnabled: boolean;

  @Column({ name: "cv_file_path", type: "varchar", length: 500, nullable: true })
  cvFilePath: string | null;

  // Optional seeker profile photo (a "this is me" picture). Stored in S3 like the
  // CV; shown to employers only when photoVisibleToEmployers is true.
  @Column({ name: "photo_file_path", type: "varchar", length: 500, nullable: true })
  photoFilePath: string | null;

  @Column({ name: "photo_visible_to_employers", type: "boolean", default: true })
  photoVisibleToEmployers: boolean;

  @Column({ name: "raw_cv_text", type: "text", nullable: true })
  rawCvText: string | null;

  // CV text extraction runs in the background after upload so the response is
  // fast: "processing" -> "completed" | "unreadable" (no text found) | "failed".
  @Column({ name: "cv_extraction_status", type: "varchar", length: 16, nullable: true })
  cvExtractionStatus: string | null;

  @Column({ name: "extracted_cv_data", type: "jsonb", nullable: true })
  extractedCvData: ExtractedCvData | null;

  @Column({ name: "nix_generated_cv", type: "jsonb", nullable: true })
  nixGeneratedCv: NixGeneratedCv | null;

  @Column({ name: "nix_generated_cv_at", type: "timestamptz", nullable: true })
  nixGeneratedCvAt: Date | null;

  @Column({ name: "cv_uploaded_at", type: "timestamptz", nullable: true })
  cvUploadedAt: Date | null;

  @Column({ name: "career_score", type: "int", nullable: true })
  careerScore: number | null;

  @Column({ name: "career_score_generated_at", type: "timestamptz", nullable: true })
  careerScoreGeneratedAt: Date | null;

  @Column({ name: "first_jobs_viewed_at", type: "timestamptz", nullable: true })
  firstJobsViewedAt: Date | null;

  @Column({ name: "interview_prep_used_at", type: "timestamptz", nullable: true })
  interviewPrepUsedAt: Date | null;

  @Column({ name: "profile_updated_after_suggestion_at", type: "timestamptz", nullable: true })
  profileUpdatedAfterSuggestionAt: Date | null;

  @Column({ name: "ee_disclosure", type: "jsonb", nullable: true })
  eeDisclosure: AnnixOrbitProfileEeDisclosure | null;

  @Column({ name: "deletion_token", type: "varchar", length: 255, nullable: true })
  deletionToken: string | null;

  @Column({ name: "deletion_token_expires", type: "timestamptz", nullable: true })
  deletionTokenExpires: Date | null;

  @Column({ name: "calendar_feed_token", type: "varchar", length: 255, nullable: true })
  calendarFeedToken: string | null;

  @Column({ name: "calendar_feed_token_created_at", type: "timestamptz", nullable: true })
  calendarFeedTokenCreatedAt: Date | null;

  @Column({ name: "phone", type: "varchar", length: 40, nullable: true })
  phone: string | null;

  @Column({ name: "interview_reminder_email", type: "boolean", default: true })
  interviewReminderEmail: boolean;

  @Column({ name: "interview_reminder_sms", type: "boolean", default: false })
  interviewReminderSms: boolean;

  @Column({ name: "interview_reminder_whatsapp", type: "boolean", default: false })
  interviewReminderWhatsapp: boolean;

  @Column({ name: "dismiss_warning_acknowledged_at", type: "timestamptz", nullable: true })
  dismissWarningAcknowledgedAt: Date | null;

  @Column({ name: "selected_tier", type: "varchar", length: 32, nullable: true })
  selectedTier: string | null;

  @Column({ name: "onboarding_completed_at", type: "timestamptz", nullable: true })
  onboardingCompletedAt: Date | null;

  @Column({ name: "phone_type", type: "varchar", length: 20, nullable: true })
  phoneType: string | null;

  @Column({ name: "age_group", type: "varchar", length: 16, nullable: true })
  ageGroup: string | null;

  @Column({ name: "app_guide_seen", type: "boolean", default: false })
  appGuideSeen: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
