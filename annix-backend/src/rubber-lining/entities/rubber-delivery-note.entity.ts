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
import { RubberSupplierCoc } from "./rubber-supplier-coc.entity";

export enum DeliveryNoteType {
  COMPOUND = "COMPOUND",
  ROLL = "ROLL",
}

export enum DeliveryNoteStatus {
  PENDING = "PENDING",
  LINKED = "LINKED",
  STOCK_CREATED = "STOCK_CREATED",
}

export interface ExtractedDeliveryNoteRoll {
  rollNumber: string;
  thicknessMm?: number | null;
  widthMm?: number | null;
  lengthM?: number | null;
  weightKg?: number | null;
  areaSqM?: number | null;
  deliveryNoteNumber?: string;
  deliveryDate?: string;
  customerName?: string;
  pageNumber?: number;
}

export interface ExtractedDeliveryNoteData {
  deliveryNoteNumber?: string;
  deliveryDate?: string;
  supplierName?: string;
  customerName?: string;
  batchRange?: string;
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
  lineItems?: ExtractedCustomerDeliveryNoteLineItem[];
}

export interface ExtractedCustomerDeliveryNotesResult {
  deliveryNotes: ExtractedCustomerDeliveryNoteData[];
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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
