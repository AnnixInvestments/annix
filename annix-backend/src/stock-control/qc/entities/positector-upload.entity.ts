import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

@Entity("positector_uploads")
export class PositectorUpload {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "original_filename", type: "varchar", length: 500 })
  originalFilename: string;

  @Column({ name: "s3_file_path", type: "varchar", length: 1000 })
  s3FilePath: string;

  @Column({ name: "batch_name", type: "varchar", length: 500, nullable: true })
  batchName: string | null;

  @Column({ name: "probe_type", type: "varchar", length: 100, nullable: true })
  probeType: string | null;

  @Column({ name: "entity_type", type: "varchar", length: 50 })
  entityType: string;

  @Column({ name: "detected_format", type: "varchar", length: 50, nullable: true })
  detectedFormat: string | null;

  @Column({ name: "header_data", type: "jsonb", default: "{}" })
  headerData: Record<string, string>;

  @Column({ name: "readings_data", type: "jsonb", default: "[]" })
  readingsData: Array<{
    index: number;
    value: number;
    units: string | null;
    raw: Record<string, string>;
  }>;

  @Column({ name: "statistics_data", type: "jsonb", nullable: true })
  statisticsData: Record<string, string> | null;

  @Column({ name: "reading_count", type: "integer", default: 0 })
  readingCount: number;

  @Column({ name: "linked_job_card_id", type: "integer", nullable: true })
  linkedJobCardId: number | null;

  @Column({ name: "import_record_id", type: "integer", nullable: true })
  importRecordId: number | null;

  @Column({ name: "imported_at", type: "timestamp with time zone", nullable: true })
  importedAt: Date | null;

  @Column({ name: "uploaded_by_name", type: "varchar", length: 255 })
  uploadedByName: string;

  @Column({ name: "uploaded_by_id", type: "integer", nullable: true })
  uploadedById: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
  updatedAt: Date;
}
