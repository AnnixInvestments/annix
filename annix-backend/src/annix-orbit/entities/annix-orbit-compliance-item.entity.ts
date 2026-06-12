import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const ORBIT_COMPLIANCE_DOC_TYPES = [
  "ID document",
  "Qualification",
  "Certificate",
  "Driver's licence",
  "References",
  "Police clearance",
  "Medical certificate",
  "Work permit",
  "Tax number",
  "Bank confirmation",
  "Other",
] as const;

export const ORBIT_COMPLIANCE_STATUSES = [
  "missing",
  "received",
  "verified",
  "expiring",
  "expired",
] as const;
export type AnnixOrbitComplianceStatus = (typeof ORBIT_COMPLIANCE_STATUSES)[number];

@Entity("orbit_compliance_items")
@Index(["companyId"])
export class AnnixOrbitComplianceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "document_type", type: "varchar", length: 100 })
  documentType: string;

  @Column({ type: "varchar", length: 20, default: "missing" })
  status: AnnixOrbitComplianceStatus;

  @Column({ name: "expiry_date", type: "varchar", length: 20, nullable: true })
  expiryDate: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
