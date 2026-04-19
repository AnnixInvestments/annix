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

export interface CdnLineMatch {
  lineItemId: number | null;
  cdnDescription: string;
  cdnQuantity: number | null;
  matchedDescription: string | null;
  matchedQuantity: number | null;
  confidence: number;
  dispatched: boolean;
}

@Entity("dispatch_cdns")
export class DispatchCdn {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobCard,
    (jobCard) => jobCard.dispatchCdns,
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

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "cdn_number", type: "varchar", length: 255, nullable: true })
  cdnNumber: string | null;

  @Column({ name: "line_matches", type: "jsonb", nullable: true })
  lineMatches: CdnLineMatch[] | null;

  @Column({ name: "ai_raw_response", type: "text", nullable: true })
  aiRawResponse: string | null;

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
