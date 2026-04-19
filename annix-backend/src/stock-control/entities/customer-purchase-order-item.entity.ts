import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("customer_purchase_order_items")
export class CustomerPurchaseOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "cpo_id" })
  cpoId: number;

  @ManyToOne(
    () => CustomerPurchaseOrder,
    (cpo) => cpo.items,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "cpo_id" })
  cpo: CustomerPurchaseOrder;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "item_code", type: "varchar", length: 500, nullable: true })
  itemCode: string | null;

  @Column({ name: "item_description", type: "text", nullable: true })
  itemDescription: string | null;

  @Column({ name: "item_no", type: "varchar", length: 500, nullable: true })
  itemNo: string | null;

  @Column({ name: "quantity_ordered", type: "numeric", precision: 12, scale: 2, default: 0 })
  quantityOrdered: number;

  @Column({ name: "quantity_fulfilled", type: "numeric", precision: 12, scale: 2, default: 0 })
  quantityFulfilled: number;

  @Column({ name: "jt_no", type: "varchar", length: 500, nullable: true })
  jtNo: string | null;

  @Column({ name: "m2", type: "numeric", precision: 12, scale: 4, nullable: true })
  m2: number | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
