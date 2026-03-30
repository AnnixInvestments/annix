import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "./company.entity";
import { Contact } from "./contact.entity";
import { DeliveryNoteItem } from "./delivery-note-item.entity";

export enum DeliveryNoteSourceModule {
  STOCK_CONTROL = "stock-control",
  AU_RUBBER = "au-rubber",
}

export enum DeliveryNoteType {
  GENERAL = "GENERAL",
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

export enum ExtractionStatus {
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

@Entity("platform_delivery_notes")
export class PlatformDeliveryNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(() => Company, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: Company;

  @Column({
    name: "source_module",
    type: "varchar",
    length: 30,
  })
  sourceModule: DeliveryNoteSourceModule;

  @Column({ name: "delivery_number", type: "varchar", length: 100 })
  deliveryNumber: string;

  @Column({
    name: "delivery_note_type",
    type: "varchar",
    length: 20,
    default: DeliveryNoteType.GENERAL,
  })
  deliveryNoteType: DeliveryNoteType;

  @Column({
    name: "status",
    type: "varchar",
    length: 20,
    default: DeliveryNoteStatus.PENDING,
  })
  status: DeliveryNoteStatus;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: "supplier_contact_id", type: "int", nullable: true })
  supplierContactId: number | null;

  @ManyToOne(() => Contact, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "supplier_contact_id" })
  supplierContact: Contact | null;

  @Column({ name: "delivery_date", type: "date", nullable: true })
  deliveryDate: Date | null;

  @Column({ name: "customer_reference", type: "varchar", length: 200, nullable: true })
  customerReference: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "document_path", type: "varchar", length: 500, nullable: true })
  documentPath: string | null;

  @Column({ name: "received_by", type: "varchar", length: 255, nullable: true })
  receivedBy: string | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @Column({
    name: "extraction_status",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  extractionStatus: ExtractionStatus | null;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: Record<string, unknown> | null;

  @Column({ name: "linked_coc_id", type: "int", nullable: true })
  linkedCocId: number | null;

  @Column({ type: "int", default: 1 })
  version: number;

  @Column({ name: "previous_version_id", type: "int", nullable: true })
  previousVersionId: number | null;

  @Column({
    name: "version_status",
    type: "varchar",
    length: 30,
    default: "ACTIVE",
  })
  versionStatus: string;

  @Column({ name: "stock_category", type: "varchar", length: 100, nullable: true })
  stockCategory: string | null;

  @Column({ name: "pod_page_numbers", type: "jsonb", nullable: true })
  podPageNumbers: number[] | null;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, nullable: true })
  firebaseUid: string | null;

  @Column({ name: "legacy_sc_delivery_note_id", type: "int", nullable: true })
  legacyScDeliveryNoteId: number | null;

  @Column({ name: "legacy_rubber_delivery_note_id", type: "int", nullable: true })
  legacyRubberDeliveryNoteId: number | null;

  @OneToMany(
    () => DeliveryNoteItem,
    (item) => item.deliveryNote,
    { cascade: true },
  )
  items: DeliveryNoteItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
