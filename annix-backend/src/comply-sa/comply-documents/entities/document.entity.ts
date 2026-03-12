import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ComplySaCompany } from "../../companies/entities/company.entity";

@Entity("comply_sa_documents")
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

  @Column({ name: "expiry_date", type: "varchar", length: 50, nullable: true })
  expiryDate!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ManyToOne(
    () => ComplySaCompany,
    (company) => company.documents,
  )
  @JoinColumn({ name: "company_id" })
  company!: ComplySaCompany;
}
