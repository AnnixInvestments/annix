import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockIssuance } from "./stock-issuance.entity";
import { StockItem } from "./stock-item.entity";
import { SupplierCertificate } from "./supplier-certificate.entity";

@Entity("issuance_batch_records")
export class IssuanceBatchRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockIssuance, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stock_issuance_id" })
  stockIssuance: StockIssuance;

  @Column({ name: "stock_issuance_id" })
  stockIssuanceId: number;

  @ManyToOne(() => StockItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stock_item_id" })
  stockItem: StockItem;

  @Column({ name: "stock_item_id" })
  stockItemId: number;

  @ManyToOne(() => JobCard, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard | null;

  @Column({ name: "job_card_id", nullable: true })
  jobCardId: number | null;

  @Column({ name: "batch_number", type: "varchar", length: 255 })
  batchNumber: string;

  @Column({ name: "quantity", type: "numeric", precision: 12, scale: 2 })
  quantity: number;

  @ManyToOne(() => SupplierCertificate, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "supplier_certificate_id" })
  supplierCertificate: SupplierCertificate | null;

  @Column({ name: "supplier_certificate_id", nullable: true })
  supplierCertificateId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
