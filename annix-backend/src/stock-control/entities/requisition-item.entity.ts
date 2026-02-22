import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Requisition } from "./requisition.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";

@Entity("requisition_items")
export class RequisitionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "requisition_id" })
  requisitionId: number;

  @ManyToOne(() => Requisition, (req) => req.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "requisition_id" })
  requisition: Requisition;

  @Column({ name: "stock_item_id", nullable: true })
  stockItemId: number | null;

  @ManyToOne(() => StockItem, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "stock_item_id" })
  stockItem: StockItem | null;

  @Column({ name: "product_name", type: "varchar", length: 255 })
  productName: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  area: string | null;

  @Column({ name: "litres_required", type: "numeric", precision: 12, scale: 2 })
  litresRequired: number;

  @Column({ name: "pack_size_litres", type: "numeric", precision: 12, scale: 2, default: 20 })
  packSizeLitres: number;

  @Column({ name: "packs_to_order", type: "integer" })
  packsToOrder: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;
}
