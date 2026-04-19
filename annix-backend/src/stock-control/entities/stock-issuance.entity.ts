import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { IssuanceSession } from "./issuance-session.entity";
import { JobCard } from "./job-card.entity";
import { StaffMember } from "./staff-member.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { StockItem } from "./stock-item.entity";

@Entity("stock_issuances")
export class StockIssuance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stock_item_id" })
  stockItem: StockItem;

  @Column({ name: "stock_item_id" })
  stockItemId: number;

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

  @ManyToOne(() => JobCard, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard | null;

  @Column({ name: "job_card_id", nullable: true })
  jobCardId: number | null;

  @ManyToOne(() => IssuanceSession, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "session_id" })
  session: IssuanceSession | null;

  @Column({ name: "session_id", nullable: true })
  sessionId: number | null;

  @ManyToOne(() => CustomerPurchaseOrder, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "cpo_id" })
  cpo: CustomerPurchaseOrder | null;

  @Column({ name: "cpo_id", nullable: true })
  cpoId: number | null;

  @Column({ type: "integer" })
  quantity: number;

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

  @Column({ type: "boolean", default: false })
  undone: boolean;

  @Column({ name: "undone_at", type: "timestamptz", nullable: true })
  undoneAt: Date | null;

  @Column({ name: "undone_by_name", type: "varchar", length: 255, nullable: true })
  undoneByName: string | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_issued_by_user_id" })
  unifiedIssuedByUser?: User | null;

  @Column({ name: "unified_issued_by_user_id", nullable: true })
  unifiedIssuedByUserId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
