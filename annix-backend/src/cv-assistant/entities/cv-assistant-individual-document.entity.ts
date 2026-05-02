import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CvAssistantProfile } from "./cv-assistant-profile.entity";

export enum IndividualDocumentKind {
  CV = "cv",
  QUALIFICATION = "qualification",
  CERTIFICATE = "certificate",
}

@Entity("cv_assistant_individual_documents")
@Index(["profileId", "kind"])
export class CvAssistantIndividualDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CvAssistantProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profile_id" })
  profile: CvAssistantProfile;

  @Column({ name: "profile_id" })
  profileId: number;

  @Column({ type: "varchar", length: 20 })
  kind: IndividualDocumentKind;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "size_bytes", type: "int" })
  sizeBytes: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  label: string | null;

  @CreateDateColumn({ name: "uploaded_at" })
  uploadedAt: Date;
}
