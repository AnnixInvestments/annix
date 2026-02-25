import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("job_card_versions")
export class JobCardVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobCard,
    (jobCard) => jobCard.versions,
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

  @Column({ name: "version_number", type: "integer" })
  versionNumber: number;

  @Column({ name: "file_path", type: "varchar", length: 500, nullable: true })
  filePath: string | null;

  @Column({ name: "original_filename", type: "varchar", length: 255, nullable: true })
  originalFilename: string | null;

  @Column({ name: "job_name", type: "varchar", length: 255 })
  jobName: string;

  @Column({ name: "customer_name", type: "varchar", length: 255, nullable: true })
  customerName: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "line_items_snapshot", type: "jsonb", nullable: true })
  lineItemsSnapshot: Record<string, unknown>[] | null;

  @Column({ name: "amendment_notes", type: "text", nullable: true })
  amendmentNotes: string | null;

  @Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
