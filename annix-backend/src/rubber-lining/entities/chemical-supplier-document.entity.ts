import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { DocumentVersionStatus } from "./document-version.types";
import { RubberCompany } from "./rubber-company.entity";
import { CocProcessingStatus } from "./rubber-supplier-coc.entity";

export interface ChemicalCoaTestResult {
  test: string;
  unit?: string | null;
  result?: string | null;
  method?: string | null;
}

export interface ChemicalDocExtractedData {
  productName?: string | null;
  supplierName?: string | null;
  casNumber?: string | null;
  deliveryNoteNumber?: string | null;
  batchNumber?: string | null;

  manufactureDate?: string | null;
  expiryDate?: string | null;

  unNumber?: string | null;
  hazardClass?: string | null;
  packingGroup?: string | null;
  properShippingName?: string | null;
  environmentalHazard?: string | null;

  netMassKg?: number | null;
  volume?: string | null;
  packagingType?: string | null;
  packageQuantity?: number | null;

  coaTestResults?: ChemicalCoaTestResult[];
}

@Entity("chemical_supplier_documents")
export class ChemicalSupplierDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "supplier_company_id", type: "int", nullable: true })
  supplierCompanyId: number | null;

  @ManyToOne(() => RubberCompany, { nullable: true })
  @JoinColumn({ name: "supplier_company_id" })
  supplierCompany: RubberCompany | null;

  @Column({ name: "delivery_note_number", type: "varchar", length: 255, nullable: true })
  deliveryNoteNumber: string | null;

  @Column({ name: "batch_number", type: "varchar", length: 255, nullable: true })
  batchNumber: string | null;

  @Column({ name: "product_name", type: "varchar", length: 255, nullable: true })
  productName: string | null;

  @Column({ name: "document_path", type: "varchar", length: 500 })
  documentPath: string;

  @Column({ name: "document_hash", type: "varchar", length: 64, nullable: true })
  documentHash: string | null;

  @Column({
    name: "processing_status",
    type: "varchar",
    length: 30,
    default: CocProcessingStatus.PENDING,
  })
  processingStatus: CocProcessingStatus;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ChemicalDocExtractedData | null;

  @Column({ name: "review_notes", type: "text", nullable: true })
  reviewNotes: string | null;

  @Column({ name: "approved_by", type: "varchar", length: 100, nullable: true })
  approvedBy: string | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @Column({ name: "version", type: "int", default: 1 })
  version: number;

  @Column({ name: "previous_version_id", type: "int", nullable: true })
  previousVersionId: number | null;

  @ManyToOne(() => ChemicalSupplierDocument, { nullable: true })
  @JoinColumn({ name: "previous_version_id" })
  previousVersion: ChemicalSupplierDocument | null;

  @Column({
    name: "version_status",
    type: "varchar",
    length: 30,
    default: DocumentVersionStatus.ACTIVE,
  })
  versionStatus: DocumentVersionStatus;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
