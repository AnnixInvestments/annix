import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { StockItem } from "./stock-item.entity";

@Entity("dispatch_scans")
export class DispatchScan {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobCard,
    (jobCard) => jobCard.dispatchScans,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

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

  @ManyToOne(() => StockAllocation, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "allocation_id" })
  allocation: StockAllocation | null;

  @Column({ name: "allocation_id", nullable: true })
  allocationId: number | null;

  @Column({ name: "quantity_dispatched", type: "integer" })
  quantityDispatched: number;

  @ManyToOne(() => StockControlUser, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "scanned_by_id" })
  scannedBy: StockControlUser | null;

  @Column({ name: "scanned_by_id", nullable: true })
  scannedById: number | null;

  @Column({ name: "scanned_by_name", type: "varchar", length: 255, nullable: true })
  scannedByName: string | null;

  @Column({ name: "dispatch_notes", type: "text", nullable: true })
  dispatchNotes: string | null;

  @CreateDateColumn({ name: "scanned_at" })
  scannedAt: Date;
}
