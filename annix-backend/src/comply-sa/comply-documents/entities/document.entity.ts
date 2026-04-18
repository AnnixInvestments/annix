import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Company } from "../../../platform/entities/company.entity";
import { ComplySaComplianceRequirement } from "../../compliance/entities/compliance-requirement.entity";

@Entity("comply_sa_documents")
@Unique(["companyId", "filePath"])
export class ComplySaDocument {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "company_id", type: "int" })
  companyId!: number;

  @Column({ name: "requirement_id", type: "int", nullable: true })
  requirementId!: number | null;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath!: string;

  @Column({ name: "mime_type", type: "varchar", length: 100, nullable: true })
  mimeType!: string | null;

  @Column({ name: "size_bytes", type: "int", nullable: true })
  sizeBytes!: number | null;

  @Column({ name: "uploaded_by_user_id", type: "int", nullable: true })
  uploadedByUserId!: number | null;

  @Column({ name: "expiry_date", type: "timestamp", nullable: true })
  expiryDate!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ManyToOne(() => Company, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => ComplySaComplianceRequirement, { onDelete: "SET NULL" })
  @JoinColumn({ name: "requirement_id" })
  requirement!: ComplySaComplianceRequirement | null;
}
