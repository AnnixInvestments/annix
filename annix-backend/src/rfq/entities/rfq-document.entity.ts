import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Rfq } from './rfq.entity';
import { User } from '../../user/entities/user.entity';

@Entity('rfq_documents')
export class RfqDocument {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Associated RFQ', type: () => Rfq })
  @ManyToOne(() => Rfq, (rfq) => rfq.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq;

  @ApiProperty({ description: 'Original filename', example: 'project-specs.pdf' })
  @Column({ name: 'filename' })
  filename: string;

  @ApiProperty({ description: 'Storage path', example: 'rfq-documents/1/abc123.pdf' })
  @Column({ name: 'file_path' })
  filePath: string;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  @Column({ name: 'mime_type' })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes', example: 1024000 })
  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @ApiProperty({ description: 'User who uploaded the document', type: () => User, required: false })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy?: User;

  @ApiProperty({ description: 'Upload date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
