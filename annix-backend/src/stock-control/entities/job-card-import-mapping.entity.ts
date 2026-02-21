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

@Entity("job_card_import_mappings")
export class JobCardImportMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", unique: true })
  companyId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "job_number_column", type: "varchar", length: 255 })
  jobNumberColumn: string;

  @Column({ name: "job_name_column", type: "varchar", length: 255 })
  jobNameColumn: string;

  @Column({ name: "customer_name_column", type: "varchar", length: 255, nullable: true })
  customerNameColumn: string | null;

  @Column({ name: "description_column", type: "varchar", length: 255, nullable: true })
  descriptionColumn: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
