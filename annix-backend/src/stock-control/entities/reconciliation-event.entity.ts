import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ReconciliationItem } from "./reconciliation-item.entity";

export enum ReconciliationEventType {
  QA_RELEASE = "qa_release",
  POLYMER_DN = "polymer_dn",
  MPS_DN = "mps_dn",
  MANUAL_ADJUSTMENT = "manual_adjustment",
}

@Entity("reconciliation_events")
export class ReconciliationEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ReconciliationItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reconciliation_item_id" })
  reconciliationItem: ReconciliationItem;

  @Column({ name: "reconciliation_item_id" })
  reconciliationItemId: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "event_type", type: "varchar", length: 30 })
  eventType: ReconciliationEventType;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: "reference_number", type: "varchar", length: 255, nullable: true })
  referenceNumber: string | null;

  @Column({ name: "performed_by_name", type: "varchar", length: 255 })
  performedByName: string;

  @Column({ name: "performed_by_id", nullable: true })
  performedById: number | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
