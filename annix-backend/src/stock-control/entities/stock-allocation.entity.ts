import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { StockItem } from "./stock-item.entity";
import { JobCard } from "./job-card.entity";

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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
