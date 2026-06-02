import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const ORBIT_CLIENT_STATUSES = ["prospect", "active", "on_hold", "inactive"] as const;
export type AnnixOrbitClientStatus = (typeof ORBIT_CLIENT_STATUSES)[number];

@Entity("orbit_clients")
@Index(["companyId"])
export class AnnixOrbitClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  industry: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  province: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ name: "contact_name", type: "varchar", length: 255, nullable: true })
  contactName: string | null;

  @Column({ name: "contact_email", type: "varchar", length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ name: "contact_phone", type: "varchar", length: 50, nullable: true })
  contactPhone: string | null;

  @Column({ name: "fee_percentage", type: "numeric", nullable: true })
  feePercentage: number | null;

  @Column({ name: "payment_terms", type: "varchar", length: 100, nullable: true })
  paymentTerms: string | null;

  @Column({ type: "varchar", length: 20, default: "prospect" })
  status: AnnixOrbitClientStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
