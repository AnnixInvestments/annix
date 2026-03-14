import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum AdminTransferStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

@Entity("stock_control_admin_transfers")
@Index(["token"], { unique: true })
export class StockControlAdminTransfer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "initiated_by_id" })
  initiatedBy: StockControlUser;

  @Column({ name: "initiated_by_id" })
  initiatedById: number;

  @Column({ name: "target_email", type: "varchar", length: 255 })
  targetEmail: string;

  @Column({ type: "varchar", length: 255 })
  token: string;

  @Column({ name: "new_role_for_initiator", type: "varchar", length: 50, nullable: true })
  newRoleForInitiator: string | null;

  @Column({ type: "varchar", length: 50, default: AdminTransferStatus.PENDING })
  status: AdminTransferStatus;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "accepted_at", type: "timestamptz", nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
