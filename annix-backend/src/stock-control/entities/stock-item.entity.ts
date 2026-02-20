import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { StockAllocation } from "./stock-allocation.entity";
import { StockMovement } from "./stock-movement.entity";
import { DeliveryNoteItem } from "./delivery-note-item.entity";

@Entity("stock_items")
export class StockItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100, unique: true })
  sku: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  category: string | null;

  @Column({ name: "unit_of_measure", type: "varchar", length: 50, default: "each" })
  unitOfMeasure: string;

  @Column({ name: "cost_per_unit", type: "numeric", precision: 12, scale: 2, default: 0 })
  costPerUnit: number;

  @Column({ type: "integer", default: 0 })
  quantity: number;

  @Column({ name: "min_stock_level", type: "integer", default: 0 })
  minStockLevel: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  location: string | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @OneToMany(
    () => StockAllocation,
    (allocation) => allocation.stockItem,
  )
  allocations: StockAllocation[];

  @OneToMany(
    () => StockMovement,
    (movement) => movement.stockItem,
  )
  movements: StockMovement[];

  @OneToMany(
    () => DeliveryNoteItem,
    (deliveryNoteItem) => deliveryNoteItem.stockItem,
  )
  deliveryNoteItems: DeliveryNoteItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
