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
import { SupplierInvoiceItem } from "./supplier-invoice-item.entity";

@Entity("invoice_extraction_corrections")
export class InvoiceExtractionCorrection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "supplier_name", type: "varchar", length: 255 })
  supplierName: string;

  @ManyToOne(() => SupplierInvoiceItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "invoice_item_id" })
  invoiceItem: SupplierInvoiceItem;

  @Column({ name: "invoice_item_id" })
  invoiceItemId: number;

  @Column({ name: "field_name", type: "varchar", length: 50 })
  fieldName: string;

  @Column({ name: "original_value", type: "text", nullable: true })
  originalValue: string | null;

  @Column({ name: "corrected_value", type: "text" })
  correctedValue: string;

  @Column({ name: "extracted_description", type: "text", nullable: true })
  extractedDescription: string | null;

  @ManyToOne(() => StockControlUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "corrected_by" })
  correctedByUser: StockControlUser | null;

  @Column({ name: "corrected_by", nullable: true })
  correctedBy: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
