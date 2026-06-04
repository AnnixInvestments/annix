import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AnnixOrbitProfile } from "./annix-orbit-profile.entity";

export enum IndividualDocumentKind {
  CV = "cv",
  QUALIFICATION = "qualification",
  CERTIFICATE = "certificate",
}

@Entity("cv_assistant_individual_documents")
@Index(["profileId", "kind"])
export class AnnixOrbitIndividualDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AnnixOrbitProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profile_id" })
  profile: AnnixOrbitProfile;

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

  @Column({ name: "is_photo_capture", type: "boolean", default: false })
  isPhotoCapture: boolean;

  @Column({ name: "needs_clear_scan", type: "boolean", default: false })
  needsClearScan: boolean;

  @Column({ name: "scan_reminders_sent", type: "int", default: 0 })
  scanRemindersSent: number;

  @Column({ name: "last_scan_reminder_at", type: "timestamptz", nullable: true })
  lastScanReminderAt: Date | null;

  @CreateDateColumn({ name: "uploaded_at" })
  uploadedAt: Date;
}
