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
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { StaffMember } from "./staff-member.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { StockIssuance } from "./stock-issuance.entity";

export enum IssuanceSessionScope {
  SINGLE_JC = "single_jc",
  CPO_BATCH = "cpo_batch",
}

export enum IssuanceSessionStatus {
  ACTIVE = "active",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  UNDONE = "undone",
}

@Entity("issuance_sessions")
export class IssuanceSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => CustomerPurchaseOrder, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "cpo_id" })
  cpo: CustomerPurchaseOrder | null;

  @Column({ name: "cpo_id", nullable: true })
  cpoId: number | null;

  @ManyToOne(() => StaffMember, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issuer_staff_id" })
  issuerStaff: StaffMember;

  @Column({ name: "issuer_staff_id" })
  issuerStaffId: number;

  @ManyToOne(() => StaffMember, { onDelete: "CASCADE" })
  @JoinColumn({ name: "recipient_staff_id" })
  recipientStaff: StaffMember;

  @Column({ name: "recipient_staff_id" })
  recipientStaffId: number;

  @Column({ type: "varchar", length: 30, default: IssuanceSessionScope.SINGLE_JC })
  scope: IssuanceSessionScope;

  @Column({ type: "varchar", length: 30, default: IssuanceSessionStatus.ACTIVE })
  status: IssuanceSessionStatus;

  @Column({ name: "job_card_ids", type: "jsonb", default: [] })
  jobCardIds: number[];

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @ManyToOne(() => StockControlUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "issued_by_user_id" })
  issuedByUser: StockControlUser | null;

  @Column({ name: "issued_by_user_id", nullable: true })
  issuedByUserId: number | null;

  @Column({ name: "issued_by_name", type: "varchar", length: 255, nullable: true })
  issuedByName: string | null;

  @Column({ name: "issued_at", type: "timestamptz" })
  issuedAt: Date;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "approved_by_manager_id" })
  approvedByManager: StaffMember | null;

  @Column({ name: "approved_by_manager_id", nullable: true })
  approvedByManagerId: number | null;

  @Column({ name: "approved_at", type: "timestamptz", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "rejected_at", type: "timestamptz", nullable: true })
  rejectedAt: Date | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @Column({ name: "undone_at", type: "timestamptz", nullable: true })
  undoneAt: Date | null;

  @Column({ name: "undone_by_name", type: "varchar", length: 255, nullable: true })
  undoneByName: string | null;

  @OneToMany(
    () => StockIssuance,
    (issuance) => issuance.session,
  )
  issuances: StockIssuance[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
