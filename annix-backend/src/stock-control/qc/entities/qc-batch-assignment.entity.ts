import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

@Entity("qc_batch_assignments")
@Unique("uq_batch_assignment_item_field", ["lineItemId", "fieldKey"])
export class QcBatchAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "batch_number", type: "varchar", length: 255 })
  batchNumber: string;

  @Column({ name: "field_key", type: "varchar", length: 50 })
  fieldKey: string;

  @Column({ name: "category", type: "varchar", length: 20 })
  category: string;

  @Column({ name: "label", type: "varchar", length: 100 })
  label: string;

  @Column({ name: "line_item_id" })
  lineItemId: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "cpo_id", type: "integer", nullable: true })
  cpoId: number | null;

  @Column({ name: "positector_upload_id", type: "integer", nullable: true })
  positectorUploadId: number | null;

  @Column({ name: "supplier_certificate_id", type: "integer", nullable: true })
  supplierCertificateId: number | null;

  @Column({ name: "not_applicable", type: "boolean", default: false })
  notApplicable: boolean;

  @Column({ name: "captured_by_name", type: "varchar", length: 255 })
  capturedByName: string;

  @Column({ name: "captured_by_id", type: "integer", nullable: true })
  capturedById: number | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
  updatedAt: Date;
}
