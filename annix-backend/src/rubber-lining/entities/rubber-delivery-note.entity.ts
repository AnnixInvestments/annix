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

export interface ExtractedDeliveryNoteData {
  deliveryNoteNumber?: string;
  deliveryDate?: string;
  supplierName?: string;
  batchRange?: string;
  totalWeightKg?: number;
  rolls?: Array<{
    rollNumber: string;
    weightKg?: number;
    widthMm?: number;
    thicknessMm?: number;
    lengthM?: number;
  }>;
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
