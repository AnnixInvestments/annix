import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const ORBIT_PLACEMENT_STATUSES = [
  "offer_accepted",
  "started",
  "guarantee",
  "completed",
  "fall_off",
] as const;
export type AnnixOrbitPlacementStatus = (typeof ORBIT_PLACEMENT_STATUSES)[number];

export const ORBIT_PLACEMENT_INVOICE_STATUSES = ["not_invoiced", "invoiced", "paid"] as const;
export type AnnixOrbitPlacementInvoiceStatus = (typeof ORBIT_PLACEMENT_INVOICE_STATUSES)[number];

@Entity("orbit_placements")
@Index(["companyId"])
export class AnnixOrbitPlacement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "client_id", type: "int", nullable: true })
  clientId: number | null;

  @Column({ name: "candidate_name", type: "varchar", length: 255 })
  candidateName: string;

  @Column({ name: "job_title", type: "varchar", length: 255 })
  jobTitle: string;

  @Column({ type: "numeric", nullable: true })
  salary: number | null;

  @Column({ name: "placement_fee", type: "numeric", nullable: true })
  placementFee: number | null;

  @Column({ name: "start_date", type: "varchar", length: 20, nullable: true })
  startDate: string | null;

  @Column({ name: "guarantee_until", type: "varchar", length: 20, nullable: true })
  guaranteeUntil: string | null;

  @Column({ type: "varchar", length: 20, default: "offer_accepted" })
  status: AnnixOrbitPlacementStatus;

  @Column({ name: "invoice_status", type: "varchar", length: 20, default: "not_invoiced" })
  invoiceStatus: AnnixOrbitPlacementInvoiceStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
