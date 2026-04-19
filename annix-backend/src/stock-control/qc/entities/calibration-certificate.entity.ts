import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

@Entity("calibration_certificates")
export class CalibrationCertificate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "equipment_name", type: "varchar", length: 255 })
  equipmentName: string;

  @Column({ name: "equipment_identifier", type: "varchar", length: 255, nullable: true })
  equipmentIdentifier: string | null;

  @Column({ name: "certificate_number", type: "varchar", length: 255, nullable: true })
  certificateNumber: string | null;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "file_size_bytes", type: "bigint" })
  fileSizeBytes: number;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @Column({ name: "expiry_date", type: "date" })
  expiryDate: string;

  @Column({ name: "expiry_warning_sent_at", type: "timestamptz", nullable: true })
  expiryWarningSentAt: Date | null;

  @Column({ name: "expiry_notification_sent_at", type: "timestamptz", nullable: true })
  expiryNotificationSentAt: Date | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "uploaded_by_id", type: "integer", nullable: true })
  uploadedById: number | null;

  @Column({ name: "uploaded_by_name", type: "varchar", length: 255, nullable: true })
  uploadedByName: string | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
