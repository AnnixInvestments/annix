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
  INDIVIDUAL = "individual",
  STUDENT = "student",
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

  @Column({ name: "raw_cv_text", type: "text", nullable: true })
  rawCvText: string | null;

  @Column({ name: "extracted_cv_data", type: "jsonb", nullable: true })
  extractedCvData: ExtractedCvData | null;

  @Column({ name: "nix_generated_cv", type: "jsonb", nullable: true })
  nixGeneratedCv: NixGeneratedCv | null;

  @Column({ name: "nix_generated_cv_at", type: "timestamptz", nullable: true })
  nixGeneratedCvAt: Date | null;

  @Column({ name: "cv_uploaded_at", type: "timestamptz", nullable: true })
  cvUploadedAt: Date | null;

  @Column({ name: "ee_disclosure", type: "jsonb", nullable: true })
  eeDisclosure: AnnixOrbitProfileEeDisclosure | null;

  @Column({ name: "deletion_token", type: "varchar", length: 255, nullable: true })
  deletionToken: string | null;

  @Column({ name: "deletion_token_expires", type: "timestamptz", nullable: true })
  deletionTokenExpires: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
