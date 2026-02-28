import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberCompany } from "./rubber-company.entity";

export enum SupplierCocType {
  COMPOUNDER = "COMPOUNDER",
  CALENDARER = "CALENDARER",
}

export enum CocProcessingStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  APPROVED = "APPROVED",
}

export interface ExtractedCocData {
  cocNumber?: string;
  productionDate?: string;
  customerName?: string;
  compoundCode?: string;
  batchNumbers?: string[];
  orderNumber?: string;
  ticketNumber?: string;
  hasGraph?: boolean;
  approverNames?: string[];
  batches?: Array<{
    batchNumber: string;
    shoreA?: number;
    specificGravity?: number;
    reboundPercent?: number;
    tearStrengthKnM?: number;
    tensileStrengthMpa?: number;
    elongationPercent?: number;
    rheometerSMin?: number;
    rheometerSMax?: number;
    rheometerTs2?: number;
    rheometerTc90?: number;
    passFailStatus?: string;
  }>;
}

@Entity("rubber_supplier_cocs")
export class RubberSupplierCoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({
    name: "coc_type",
    type: "enum",
    enum: SupplierCocType,
  })
  cocType: SupplierCocType;

  @Column({ name: "supplier_company_id", type: "int" })
  supplierCompanyId: number;

  @ManyToOne(() => RubberCompany)
  @JoinColumn({ name: "supplier_company_id" })
  supplierCompany: RubberCompany;

  @Column({ name: "document_path", type: "varchar", length: 500 })
  documentPath: string;

  @Column({ name: "graph_pdf_path", type: "varchar", length: 500, nullable: true })
  graphPdfPath: string | null;

  @Column({ name: "coc_number", type: "varchar", length: 100, nullable: true })
  cocNumber: string | null;

  @Column({ name: "production_date", type: "date", nullable: true })
  productionDate: Date | null;

  @Column({ name: "compound_code", type: "varchar", length: 100, nullable: true })
  compoundCode: string | null;

  @Column({ name: "order_number", type: "varchar", length: 100, nullable: true })
  orderNumber: string | null;

  @Column({ name: "ticket_number", type: "varchar", length: 100, nullable: true })
  ticketNumber: string | null;

  @Column({
    name: "processing_status",
    type: "enum",
    enum: CocProcessingStatus,
    default: CocProcessingStatus.PENDING,
  })
  processingStatus: CocProcessingStatus;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ExtractedCocData | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
