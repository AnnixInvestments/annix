import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StaffMember } from "./staff-member.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";

@Entity("stock_allocations")
export class StockAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => StockItem,
    (stockItem) => stockItem.allocations,
  )
  @JoinColumn({ name: "stock_item_id" })
  stockItem: StockItem;

  @Column({ name: "stock_item_id" })
  stockItemId: number;

  @ManyToOne(
    () => JobCard,
    (jobCard) => jobCard.allocations,
  )
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "quantity_used", type: "numeric", precision: 12, scale: 2 })
  quantityUsed: number;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "allocated_by", type: "varchar", length: 255, nullable: true })
  allocatedBy: string | null;

  @ManyToOne(
    () => StaffMember,
    (staffMember) => staffMember.allocations,
    {
      nullable: true,
      onDelete: "SET NULL",
    },
  )
  @JoinColumn({ name: "staff_member_id" })
  staffMember: StaffMember | null;

  @Column({ name: "staff_member_id", nullable: true })
  staffMemberId: number | null;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "pending_approval", type: "boolean", default: false })
  pendingApproval: boolean;

  @Column({ name: "allowed_litres", type: "decimal", precision: 10, scale: 2, nullable: true })
  allowedLitres: number | null;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "approved_by_manager_id" })
  approvedByManager: StaffMember | null;

  @Column({ name: "approved_by_manager_id", nullable: true })
  approvedByManagerId: number | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "rejected_at", type: "timestamp", nullable: true })
  rejectedAt: Date | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @Column({ default: false })
  undone: boolean;

  @Column({ name: "undone_at", type: "timestamp", nullable: true })
  undoneAt: Date | null;

  @Column({ name: "undone_by_name", type: "varchar", nullable: true })
  undoneByName: string | null;

  @Column({ name: "pack_count", type: "integer", nullable: true })
  packCount: number | null;

  @Column({ name: "litres_per_pack", type: "decimal", precision: 10, scale: 2, nullable: true })
  litresPerPack: number | null;

  @Column({ name: "total_litres", type: "decimal", precision: 10, scale: 2, nullable: true })
  totalLitres: number | null;

  @Column({ name: "allocation_type", type: "varchar", length: 20, default: "allocation" })
  allocationType: string;

  @Column({ name: "issued_at", type: "timestamptz", nullable: true })
  issuedAt: Date | null;

  @Column({ name: "issued_by_name", type: "varchar", length: 255, nullable: true })
  issuedByName: string | null;

  @ManyToOne(() => StockItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "source_leftover_item_id" })
  sourceLeftoverItem: StockItem | null;

  @Column({ name: "source_leftover_item_id", nullable: true })
  sourceLeftoverItemId: number | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
