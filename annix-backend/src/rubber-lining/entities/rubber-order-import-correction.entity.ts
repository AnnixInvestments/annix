import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RubberCompany } from "./rubber-company.entity";

@Entity("rubber_order_import_corrections")
export class RubberOrderImportCorrection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RubberCompany, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "company_id" })
  company: RubberCompany;

  @Column({ name: "company_id", nullable: true })
  companyId: number | null;

  @Column({ name: "company_name", type: "varchar", length: 255, nullable: true })
  companyName: string | null;

  @Column({ name: "field_name", type: "varchar", length: 100 })
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
