import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RubberTaxInvoice } from "./rubber-tax-invoice.entity";

@Entity("rubber_tax_invoice_corrections")
export class RubberTaxInvoiceCorrection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RubberTaxInvoice, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tax_invoice_id" })
  taxInvoice: RubberTaxInvoice;

  @Column({ name: "tax_invoice_id" })
  taxInvoiceId: number;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: "field_name", type: "varchar", length: 50 })
  fieldName: string;

  @Column({ name: "original_value", type: "text", nullable: true })
  originalValue: string | null;

  @Column({ name: "corrected_value", type: "text" })
  correctedValue: string;

  @Column({ name: "corrected_by", type: "varchar", length: 100, nullable: true })
  correctedBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
