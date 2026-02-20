import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";

export enum MovementType {
  IN = "in",
  OUT = "out",
  ADJUSTMENT = "adjustment",
}

export enum ReferenceType {
  ALLOCATION = "allocation",
  DELIVERY = "delivery",
  IMPORT = "import",
  MANUAL = "manual",
}

@Entity("stock_movements")
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => StockItem,
    (stockItem) => stockItem.movements,
  )
  @JoinColumn({ name: "stock_item_id" })
  stockItem: StockItem;

  @Column({ name: "movement_type", type: "varchar", length: 50 })
  movementType: MovementType;

  @Column({ type: "integer" })
  quantity: number;

  @Column({ name: "reference_type", type: "varchar", length: 50, nullable: true })
  referenceType: ReferenceType | null;

  @Column({ name: "reference_id", type: "integer", nullable: true })
  referenceId: number | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
  createdBy: string | null;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
