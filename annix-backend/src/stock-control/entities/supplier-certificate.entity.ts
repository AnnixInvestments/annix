import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlSupplier } from "./stock-control-supplier.entity";
import { StockItem } from "./stock-item.entity";

@Entity("supplier_certificates")
@Unique(["companyId", "supplierId", "batchNumber", "certificateType"])
export class SupplierCertificate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlSupplier, { onDelete: "CASCADE" })
  @JoinColumn({ name: "supplier_id" })
  supplier: StockControlSupplier;

  @Column({ name: "supplier_id" })
  supplierId: number;

  @ManyToOne(() => StockItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "stock_item_id" })
  stockItem: StockItem | null;

  @Column({ name: "stock_item_id", nullable: true })
  stockItemId: number | null;

  @ManyToOne(() => JobCard, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard | null;

  @Column({ name: "job_card_id", nullable: true })
  jobCardId: number | null;

  @Column({ name: "certificate_type", type: "varchar", length: 50 })
  certificateType: string;

  @Column({ name: "batch_number", type: "varchar", length: 255 })
  batchNumber: string;

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

  @Column({ name: "expiry_date", type: "date", nullable: true })
  expiryDate: string | null;

  @Column({ name: "uploaded_by_id", nullable: true })
  uploadedById: number | null;

  @Column({ name: "uploaded_by_name", type: "varchar", length: 255, nullable: true })
  uploadedByName: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
