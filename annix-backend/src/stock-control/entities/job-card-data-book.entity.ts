import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("job_card_data_books")
export class JobCardDataBook {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "file_size_bytes", type: "bigint" })
  fileSizeBytes: number;

  @Column({ name: "generated_at", type: "timestamptz" })
  generatedAt: Date;

  @Column({ name: "generated_by_name", type: "varchar", length: 255, nullable: true })
  generatedByName: string | null;

  @Column({ name: "certificate_count", type: "integer" })
  certificateCount: number;

  @Column({ name: "is_stale", type: "boolean", default: false })
  isStale: boolean;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
