import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CustomerPurchaseOrderItem } from "./customer-purchase-order-item.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum CpoStatus {
  ACTIVE = "active",
  FULFILLED = "fulfilled",
  CANCELLED = "cancelled",
}

@Entity("customer_purchase_orders")
export class CustomerPurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "cpo_number", type: "varchar", length: 100 })
  cpoNumber: string;

  @Column({ name: "job_number", type: "varchar", length: 500 })
  jobNumber: string;

  @Column({ name: "job_name", type: "varchar", length: 255, nullable: true })
  jobName: string | null;

  @Column({ name: "customer_name", type: "varchar", length: 255, nullable: true })
  customerName: string | null;

  @Column({ name: "po_number", type: "varchar", length: 500, nullable: true })
  poNumber: string | null;

  @Column({ name: "site_location", type: "varchar", length: 255, nullable: true })
  siteLocation: string | null;

  @Column({ name: "contact_person", type: "varchar", length: 255, nullable: true })
  contactPerson: string | null;

  @Column({ name: "due_date", type: "varchar", length: 500, nullable: true })
  dueDate: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reference: string | null;

  @Column({ name: "custom_fields", type: "jsonb", nullable: true })
  customFields: Record<string, string> | null;

  @Column({ type: "varchar", length: 50, default: CpoStatus.ACTIVE })
  status: CpoStatus;

  @Column({ name: "total_items", type: "int", default: 0 })
  totalItems: number;

  @Column({ name: "total_quantity", type: "numeric", precision: 12, scale: 2, default: 0 })
  totalQuantity: number;

  @Column({ name: "fulfilled_quantity", type: "numeric", precision: 12, scale: 2, default: 0 })
  fulfilledQuantity: number;

  @Column({ name: "source_file_path", type: "varchar", length: 500, nullable: true })
  sourceFilePath: string | null;

  @Column({ name: "source_file_name", type: "varchar", length: 255, nullable: true })
  sourceFileName: string | null;

  @Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
  createdBy: string | null;

  @OneToMany(
    () => CustomerPurchaseOrderItem,
    (item) => item.cpo,
  )
  items: CustomerPurchaseOrderItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
