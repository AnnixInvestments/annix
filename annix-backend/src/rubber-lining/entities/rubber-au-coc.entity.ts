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

export enum AuCocStatus {
  DRAFT = "DRAFT",
  GENERATED = "GENERATED",
  SENT = "SENT",
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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
