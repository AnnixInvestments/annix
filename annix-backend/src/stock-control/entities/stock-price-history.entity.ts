import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { StockItem } from "./stock-item.entity";

export enum PriceChangeReason {
  INVOICE = "invoice",
  MANUAL = "manual",
  IMPORT = "import",
}

@Entity("stock_price_history")
export class StockPriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stock_item_id" })
  stockItem: StockItem;

  @Column({ name: "stock_item_id" })
  stockItemId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "old_price", type: "numeric", precision: 12, scale: 2, nullable: true })
  oldPrice: number | null;

  @Column({ name: "new_price", type: "numeric", precision: 12, scale: 2 })
  newPrice: number;

  @Column({ name: "change_reason", type: "varchar", length: 50 })
  changeReason: PriceChangeReason;

  @Column({ name: "reference_type", type: "varchar", length: 50, nullable: true })
  referenceType: string | null;

  @Column({ name: "reference_id", type: "integer", nullable: true })
  referenceId: number | null;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @ManyToOne(() => StockControlUser, { nullable: true })
  @JoinColumn({ name: "changed_by" })
  changedByUser: StockControlUser | null;

  @Column({ name: "changed_by", nullable: true })
  changedBy: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
