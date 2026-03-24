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
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";

@Entity("stock_returns")
export class StockReturn {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @ManyToOne(() => StockAllocation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "allocation_id" })
  allocation: StockAllocation;

  @Column({ name: "allocation_id" })
  allocationId: number;

  @ManyToOne(() => StockItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "original_stock_item_id" })
  originalStockItem: StockItem;

  @Column({ name: "original_stock_item_id" })
  originalStockItemId: number;

  @ManyToOne(() => StockItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "leftover_stock_item_id" })
  leftoverStockItem: StockItem | null;

  @Column({ name: "leftover_stock_item_id", nullable: true })
  leftoverStockItemId: number | null;

  @Column({ name: "litres_returned", type: "decimal", precision: 10, scale: 2 })
  litresReturned: number;

  @Column({ name: "cost_reduction", type: "decimal", precision: 12, scale: 2 })
  costReduction: number;

  @Column({ name: "returned_by_name", type: "varchar", length: 255, nullable: true })
  returnedByName: string | null;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "returned_by_staff_id" })
  returnedByStaff: StaffMember | null;

  @Column({ name: "returned_by_staff_id", nullable: true })
  returnedByStaffId: number | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
