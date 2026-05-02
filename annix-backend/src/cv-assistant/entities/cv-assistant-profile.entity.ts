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
import type { ExtractedCvData } from "./candidate.entity";

export enum CvAssistantUserType {
  COMPANY = "company",
  INDIVIDUAL = "individual",
}

@Entity("cv_assistant_profiles")
@Index(["userId"], { unique: true })
export class CvAssistantProfile {
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

  @Column({ name: "user_type", type: "varchar", length: 20, default: CvAssistantUserType.COMPANY })
  userType: CvAssistantUserType;

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

  @Column({ name: "cv_uploaded_at", type: "timestamptz", nullable: true })
  cvUploadedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
