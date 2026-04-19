import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum StockControlInvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

@Entity("stock_control_invitations")
@Index(["token"], { unique: true })
export class StockControlInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "invited_by_id" })
  invitedBy: StockControlUser;

  @Column({ name: "invited_by_id" })
  invitedById: number;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 255 })
  token: string;

  @Column({ type: "varchar", length: 50 })
  role: string;

  @Column({ type: "varchar", length: 50, default: StockControlInvitationStatus.PENDING })
  status: StockControlInvitationStatus;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "accepted_at", type: "timestamptz", nullable: true })
  acceptedAt: Date | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_invited_by_id" })
  unifiedInvitedBy?: User | null;

  @Column({ name: "unified_invited_by_id", nullable: true })
  unifiedInvitedById?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
