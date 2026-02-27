import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
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

  @ManyToOne(
    () => JobCard,
    (jobCard) => jobCard.allocations,
  )
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "quantity_used", type: "integer" })
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

  @Column({ name: "approved_by_manager_id", type: "integer", nullable: true })
  approvedByManagerId: number | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "rejected_at", type: "timestamp", nullable: true })
  rejectedAt: Date | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
