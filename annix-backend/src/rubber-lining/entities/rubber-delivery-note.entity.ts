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
import { RubberSupplierCoc } from "./rubber-supplier-coc.entity";

export enum DeliveryNoteType {
  COMPOUND = "COMPOUND",
  ROLL = "ROLL",
}

export enum DeliveryNoteStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  APPROVED = "APPROVED",
  LINKED = "LINKED",
  STOCK_CREATED = "STOCK_CREATED",
}

export interface ExtractedDeliveryNoteRoll {
  rollNumber: string | null;
  thicknessMm?: number | null;
  widthMm?: number | null;
  lengthM?: number | null;
  weightKg?: number | null;
  areaSqM?: number | null;
  deliveryNoteNumber?: string | null;
  deliveryDate?: string | null;
  customerName?: string | null;
  customerReference?: string | null;
  pageNumber?: number;
  specificGravity?: number | null;
}

export interface ExtractedDeliveryNoteData {
  deliveryNoteNumber?: string | null;
  deliveryDate?: string | null;
  supplierName?: string | null;
  customerName?: string | null;
  customerReference?: string | null;
  batchRange?: string | null;
  totalWeightKg?: number | null;
  rolls?: ExtractedDeliveryNoteRoll[];
  userCorrected?: boolean;
}

export interface ExtractedCustomerDeliveryNoteLineItem {
  lineNumber?: number;
  compoundCode?: string;
  compoundType?: string;
  compoundDescription?: string;
  thicknessMm?: number;
  widthMm?: number;
  lengthM?: number;
  quantity?: number;
  rollWeightKg?: number;
  weightPerRollKg?: number;
  specificGravity?: number;
  rollNumber?: string;
  actualWeightKg?: number;
  cocBatchNumbers?: string[];
}

export interface ExtractedCustomerDeliveryNoteData {
  deliveryNoteNumber?: string;
  customerReference?: string;
  deliveryDate?: string;
  customerName?: string;
  pageInfo?: { currentPage?: number; totalPages?: number };
  sourcePages?: number[];
  lineItems?: ExtractedCustomerDeliveryNoteLineItem[];
}

export interface ExtractedCustomerDeliveryNotePodPage {
  pageNumber: number;
  relatedDnNumber: string | null;
}

export interface ExtractedCustomerDeliveryNotesResult {
  deliveryNotes: ExtractedCustomerDeliveryNoteData[];
  podPages?: ExtractedCustomerDeliveryNotePodPage[];
}

@Entity("rubber_delivery_notes")
export class RubberDeliveryNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({
    name: "delivery_note_type",
    type: "enum",
    enum: DeliveryNoteType,
  })
  deliveryNoteType: DeliveryNoteType;

  @Column({ name: "delivery_note_number", type: "varchar", length: 100 })
  deliveryNoteNumber: string;

  @Column({ name: "delivery_date", type: "date", nullable: true })
  deliveryDate: Date | null;

  @Column({ name: "customer_reference", type: "varchar", length: 200, nullable: true })
  customerReference: string | null;

  @Column({ name: "supplier_company_id", type: "int" })
  supplierCompanyId: number;

  @ManyToOne(() => RubberCompany)
  @JoinColumn({ name: "supplier_company_id" })
  supplierCompany: RubberCompany;

  @Column({ name: "document_path", type: "varchar", length: 500, nullable: true })
  documentPath: string | null;

  @Column({
    name: "status",
    type: "enum",
    enum: DeliveryNoteStatus,
    default: DeliveryNoteStatus.PENDING,
  })
  status: DeliveryNoteStatus;

  @Column({ name: "linked_coc_id", type: "int", nullable: true })
  linkedCocId: number | null;

  @ManyToOne(() => RubberSupplierCoc, { nullable: true })
  @JoinColumn({ name: "linked_coc_id" })
  linkedCoc: RubberSupplierCoc | null;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ExtractedDeliveryNoteData | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @Column({ name: "version", type: "int", default: 1 })
  version: number;

  @Column({ name: "previous_version_id", type: "int", nullable: true })
  previousVersionId: number | null;

  @ManyToOne(() => RubberDeliveryNote, { nullable: true })
  @JoinColumn({ name: "previous_version_id" })
  previousVersion: RubberDeliveryNote | null;

  @Column({
    name: "version_status",
    type: "varchar",
    length: 30,
    default: DocumentVersionStatus.ACTIVE,
  })
  versionStatus: DocumentVersionStatus;

  @Column({ name: "pod_page_numbers", type: "jsonb", nullable: true })
  podPageNumbers: number[] | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
