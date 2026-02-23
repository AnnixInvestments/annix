import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";

export interface FieldMapping {
  column: number;
  startRow: number;
  endRow: number;
}

export interface CustomFieldMapping {
  fieldName: string;
  column: number;
  startRow: number;
  endRow: number;
}

export interface ImportMappingConfig {
  jobNumber: FieldMapping | null;
  jcNumber: FieldMapping | null;
  pageNumber: FieldMapping | null;
  jobName: FieldMapping | null;
  customerName: FieldMapping | null;
  description: FieldMapping | null;
  poNumber: FieldMapping | null;
  siteLocation: FieldMapping | null;
  contactPerson: FieldMapping | null;
  dueDate: FieldMapping | null;
  notes: FieldMapping | null;
  reference: FieldMapping | null;
  customFields: CustomFieldMapping[];
  lineItems: {
    itemCode: FieldMapping | null;
    itemDescription: FieldMapping | null;
    itemNo: FieldMapping | null;
    quantity: FieldMapping | null;
    jtNo: FieldMapping | null;
  };
}

@Entity("job_card_import_mappings")
export class JobCardImportMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", unique: true })
  companyId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "mapping_config", type: "jsonb", nullable: true })
  mappingConfig: ImportMappingConfig | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
