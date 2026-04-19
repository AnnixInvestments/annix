import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum JobCardDocumentType {
  SCANNED_FORM = "scanned_form",
  SYSTEM_GENERATED = "system_generated",
  SUPPORTING = "supporting",
}

@Entity("job_card_documents")
export class JobCardDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobCard,
    (jobCard) => jobCard.documents,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "document_type", type: "varchar", length: 50 })
  documentType: JobCardDocumentType;

  @Column({ name: "file_url", type: "text" })
  fileUrl: string;

  @Column({ name: "original_filename", type: "varchar", length: 255, nullable: true })
  originalFilename: string | null;

  @Column({ name: "mime_type", type: "varchar", length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: "file_size_bytes", type: "integer", nullable: true })
  fileSizeBytes: number | null;

  @ManyToOne(() => StockControlUser, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "uploaded_by_id" })
  uploadedBy: StockControlUser | null;

  @Column({ name: "uploaded_by_id", nullable: true })
  uploadedById: number | null;

  @Column({ name: "uploaded_by_name", type: "varchar", length: 255, nullable: true })
  uploadedByName: string | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_uploaded_by_id" })
  unifiedUploadedBy?: User | null;

  @Column({ name: "unified_uploaded_by_id", nullable: true })
  unifiedUploadedById?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
