import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../user/entities/user.entity";

@Entity("secure_document")
export class SecureDocument {
  @ApiProperty({
    description: "Primary key (UUID)",
    example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    description: "URL-friendly slug",
    example: "fly-deployment-technical-docs",
  })
  @Column({ unique: true })
  slug: string;

  @ApiProperty({
    description: "Document title",
    example: "Fly Deployment Technical Docs",
  })
  @Column()
  title: string;

  @ApiProperty({
    description: "Brief description for listing",
    example: "Neon DB, Fly.io credentials",
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ description: "S3 path to encrypted content file" })
  @Column({ name: "storage_path" })
  storagePath: string;

  @ApiProperty({
    description: "Type of document",
    example: "markdown",
    enum: ["markdown", "pdf", "excel", "word", "other"],
  })
  @Column({ name: "file_type", default: "markdown" })
  fileType: string;

  @ApiProperty({
    description: "Original filename for binary uploads",
    example: "deployment-guide.pdf",
  })
  @Column({ name: "original_filename", nullable: true, type: "varchar" })
  originalFilename: string | null;

  @ApiProperty({
    description: "Folder path for organizing documents",
    example: "deployment/aws",
  })
  @Column({ nullable: true, type: "varchar" })
  folder: string | null;

  @ApiProperty({
    description: "S3 path to original attachment file (for non-processed uploads)",
    example: "secure-documents/attachments/abc123.xlsx",
  })
  @Column({ name: "attachment_path", nullable: true, type: "varchar" })
  attachmentPath: string | null;

  @ApiProperty({ description: "User who created the document" })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "created_by_id" })
  createdBy: User;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
