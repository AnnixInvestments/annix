import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("comply_sa_government_documents")
export class ComplySaGovernmentDocument {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "varchar", length: 50 })
  category!: string;

  @Column({ name: "category_label", type: "varchar", length: 100 })
  categoryLabel!: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  department!: string | null;

  @Column({ name: "department_url", type: "varchar", length: 500, nullable: true })
  departmentUrl!: string | null;

  @Column({ name: "source_url", type: "varchar", length: 1000 })
  sourceUrl!: string;

  @Column({ name: "file_path", type: "varchar", length: 500, nullable: true })
  filePath!: string | null;

  @Column({ type: "boolean", default: false })
  synced!: boolean;

  @Column({ name: "size_bytes", type: "bigint", nullable: true })
  sizeBytes!: number | null;

  @Column({ name: "mime_type", type: "varchar", length: 100, nullable: true })
  mimeType!: string | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
