import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlSupplier } from "./stock-control-supplier.entity";

export type SupplierDocumentType =
  | "bee_certificate"
  | "tax_clearance"
  | "iso_certificate"
  | "insurance"
  | "msds"
  | "bank_confirmation"
  | "company_registration"
  | "vat_registration"
  | "other";

@Entity("supplier_documents")
export class SupplierDocument {
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

  @Column({ name: "doc_type", type: "varchar", length: 50 })
  docType: SupplierDocumentType;

  @Column({ name: "doc_number", type: "varchar", length: 100, nullable: true })
  docNumber: string | null;

  @Column({ name: "issued_at", type: "date", nullable: true })
  issuedAt: string | null;

  @Column({ name: "expires_at", type: "date", nullable: true })
  expiresAt: string | null;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "file_size_bytes", type: "bigint" })
  fileSizeBytes: number;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "uploaded_by_id", type: "integer", nullable: true })
  uploadedById: number | null;

  @Column({ name: "uploaded_by_name", type: "varchar", length: 255, nullable: true })
  uploadedByName: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
