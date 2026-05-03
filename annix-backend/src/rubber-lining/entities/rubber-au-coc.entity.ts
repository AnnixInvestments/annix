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
import { RubberDeliveryNote } from "./rubber-delivery-note.entity";

export interface ExtractedRollData {
  rollNumber: string;
  thicknessMm?: number | null;
  widthMm?: number | null;
  lengthM?: number | null;
  weightKg?: number | null;
  areaSqM?: number | null;
}

export enum AuCocStatus {
  DRAFT = "DRAFT",
  GENERATED = "GENERATED",
  APPROVED = "APPROVED",
  SENT = "SENT",
}

export enum AuCocReadinessStatus {
  NOT_TRACKED = "NOT_TRACKED",
  WAITING_FOR_CALENDERER_COC = "WAITING_FOR_CALENDERER_COC",
  WAITING_FOR_COMPOUNDER_COC = "WAITING_FOR_COMPOUNDER_COC",
  WAITING_FOR_GRAPH = "WAITING_FOR_GRAPH",
  WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL",
  READY_FOR_GENERATION = "READY_FOR_GENERATION",
  AUTO_GENERATED = "AUTO_GENERATED",
  GENERATION_FAILED = "GENERATION_FAILED",
}

export interface ReadinessDetails {
  calendererCocId: number | null;
  compounderCocId: number | null;
  graphPdfPath: string | null;
  calendererApproved: boolean;
  compounderApproved: boolean;
  missingDocuments: string[];
  lastCheckedAt: string;
}

@Entity("rubber_au_cocs")
export class RubberAuCoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "coc_number", type: "varchar", length: 100, unique: true })
  cocNumber: string;

  @Column({ name: "customer_company_id", type: "int" })
  customerCompanyId: number;

  @ManyToOne(() => RubberCompany)
  @JoinColumn({ name: "customer_company_id" })
  customerCompany: RubberCompany;

  @Column({ name: "po_number", type: "varchar", length: 100, nullable: true })
  poNumber: string | null;

  @Column({ name: "delivery_note_ref", type: "varchar", length: 100, nullable: true })
  deliveryNoteRef: string | null;

  @Column({ name: "source_delivery_note_id", type: "int", nullable: true })
  sourceDeliveryNoteId: number | null;

  @ManyToOne(() => RubberDeliveryNote, { onDelete: "SET NULL" })
  @JoinColumn({ name: "source_delivery_note_id" })
  sourceDeliveryNote: RubberDeliveryNote;

  @Column({ name: "extracted_roll_data", type: "jsonb", nullable: true })
  extractedRollData: ExtractedRollData[] | null;

  @Column({
    name: "status",
    type: "enum",
    enum: AuCocStatus,
    default: AuCocStatus.DRAFT,
  })
  status: AuCocStatus;

  @Column({ name: "generated_pdf_path", type: "varchar", length: 500, nullable: true })
  generatedPdfPath: string | null;

  @Column({ name: "sent_to_email", type: "varchar", length: 200, nullable: true })
  sentToEmail: string | null;

  @Column({ name: "sent_at", type: "timestamp", nullable: true })
  sentAt: Date | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "approved_by_name", type: "varchar", length: 100, nullable: true })
  approvedByName: string | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({
    name: "readiness_status",
    type: "enum",
    enum: AuCocReadinessStatus,
    default: AuCocReadinessStatus.NOT_TRACKED,
  })
  readinessStatus: AuCocReadinessStatus;

  @Column({ name: "readiness_details", type: "jsonb", nullable: true })
  readinessDetails: ReadinessDetails | null;

  @Column({ name: "last_auto_processed_at", type: "timestamptz", nullable: true })
  lastAutoProcessedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
