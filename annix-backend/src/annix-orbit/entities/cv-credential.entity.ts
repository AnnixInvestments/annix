import type { CredentialType } from "@annix/product-data/sa-market";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("cv_assistant_credentials")
@Index("idx_cv_credentials_candidate_expires", ["candidateId", "expiresAt"])
export class CvCredential {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "credential_type", type: "varchar", length: 50 })
  credentialType: CredentialType;

  @Column({ name: "issued_at", type: "date", nullable: true })
  issuedAt: string | null;

  @Column({ name: "expires_at", type: "date", nullable: true })
  expiresAt: string | null;

  @Column({ name: "issuing_authority", type: "varchar", length: 255, nullable: true })
  issuingAuthority: string | null;

  @Column({ name: "document_path", type: "varchar", length: 500, nullable: true })
  documentPath: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
