import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum ImportJobStatus {
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

@Entity("job_card_import_jobs")
export class JobCardImportJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "created_by_user_id", nullable: true })
  createdByUserId: number | null;

  @Column({ name: "status", type: "varchar", length: 20, default: "processing" })
  status: string;

  @Column({ name: "file_name", type: "varchar", length: 500 })
  fileName: string;

  @Column({ name: "total_documents", type: "int", default: 0 })
  totalDocuments: number;

  @Column({ name: "completed_documents", type: "int", default: 0 })
  completedDocuments: number;

  @Column({ name: "current_document_name", type: "varchar", length: 500, nullable: true })
  currentDocumentName: string | null;

  @Column({ name: "drawing_rows", type: "jsonb", default: "[]" })
  drawingRows: Record<string, unknown>[];

  @Column({ name: "quality_documents", type: "jsonb", default: "[]" })
  qualityDocuments: string[];

  @Column({ name: "document_number", type: "varchar", length: 200, nullable: true })
  documentNumber: string | null;

  @Column({ name: "source_file_path", type: "varchar", length: 1000, nullable: true })
  sourceFilePath: string | null;

  @Column({ name: "source_file_name", type: "varchar", length: 500, nullable: true })
  sourceFileName: string | null;

  @Column({ name: "error", type: "text", nullable: true })
  error: string | null;

  @Column({ name: "acknowledged", type: "boolean", default: false })
  acknowledged: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
