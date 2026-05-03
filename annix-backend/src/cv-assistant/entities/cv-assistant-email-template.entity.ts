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
import { CvAssistantCompany } from "./cv-assistant-company.entity";

export enum CvEmailTemplateKind {
  REJECTION = "rejection",
  SHORTLIST = "shortlist",
  ACCEPTANCE = "acceptance",
  REFERENCE_REQUEST = "reference_request",
  ACKNOWLEDGEMENT = "acknowledgement",
  INTERVIEW_INVITE = "interview_invite",
}

@Entity("cv_assistant_email_templates")
@Index(["companyId", "kind"], { unique: true })
export class CvAssistantEmailTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CvAssistantCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: CvAssistantCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ type: "varchar", length: 40 })
  kind: CvEmailTemplateKind;

  @Column({ type: "varchar", length: 255 })
  subject: string;

  @Column({ name: "body_html", type: "text" })
  bodyHtml: string;

  @Column({ name: "body_text", type: "text" })
  bodyText: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
