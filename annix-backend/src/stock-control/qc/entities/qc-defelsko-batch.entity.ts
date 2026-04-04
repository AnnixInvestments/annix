import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "../../entities/stock-control-company.entity";
import { SupplierCertificate } from "../../entities/supplier-certificate.entity";

@Entity("qc_defelsko_batches")
export class QcDefelskoBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "category", type: "varchar", length: 20 })
  category: string;

  @Column({ name: "field_key", type: "varchar", length: 50 })
  fieldKey: string;

  @Column({ name: "label", type: "varchar", length: 100 })
  label: string;

  @Column({ name: "batch_number", type: "varchar", length: 255, nullable: true })
  batchNumber: string | null;

  @Column({ name: "not_applicable", type: "boolean", default: false })
  notApplicable: boolean;

  @Column({ name: "captured_by_name", type: "varchar", length: 255 })
  capturedByName: string;

  @Column({ name: "captured_by_id", type: "integer", nullable: true })
  capturedById: number | null;

  @ManyToOne(() => SupplierCertificate, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "supplier_certificate_id" })
  supplierCertificate: SupplierCertificate | null;

  @Column({ name: "supplier_certificate_id", nullable: true })
  supplierCertificateId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
