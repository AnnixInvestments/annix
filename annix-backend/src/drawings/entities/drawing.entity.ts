import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Rfq } from '../../rfq/entities/rfq.entity';
import { DrawingVersion } from './drawing-version.entity';
import { DrawingComment } from './drawing-comment.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum DrawingFileType {
  PDF = 'pdf',
  DWG = 'dwg',
  DXF = 'dxf',
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
}

export enum DrawingStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('drawings')
@Index(['status'])
export class Drawing {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Auto-generated drawing number', example: 'DRW-2025-0001' })
  @Column({ name: 'drawing_number', length: 50, unique: true })
  drawingNumber: string;

  @ApiProperty({ description: 'Drawing title', example: 'Pipeline Section A - General Arrangement' })
  @Column({ name: 'title', length: 255 })
  title: string;

  @ApiProperty({ description: 'Drawing description', required: false })
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'File type', enum: DrawingFileType })
  @Column({ name: 'file_type', type: 'enum', enum: DrawingFileType })
  fileType: DrawingFileType;

  @ApiProperty({ description: 'File path in storage' })
  @Column({ name: 'file_path', length: 500 })
  filePath: string;

  @ApiProperty({ description: 'Original filename' })
  @Column({ name: 'original_filename', length: 255 })
  originalFilename: string;

  @ApiProperty({ description: 'File size in bytes', example: 1024000 })
  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @ApiProperty({ description: 'Current version number', example: 1 })
  @Column({ name: 'current_version', default: 1 })
  currentVersion: number;

  @ApiProperty({ description: 'Drawing status', enum: DrawingStatus })
  @Column({ name: 'status', type: 'enum', enum: DrawingStatus, default: DrawingStatus.DRAFT })
  status: DrawingStatus;

  @ApiProperty({ description: 'Associated RFQ', type: () => Rfq, required: false })
  @ManyToOne(() => Rfq, (rfq) => rfq.drawings, { nullable: true })
  @JoinColumn({ name: 'rfq_id' })
  rfq?: Rfq;

  @ApiProperty({ description: 'User who uploaded the drawing', type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy: User;

  @ApiProperty({ description: 'Version history', type: () => [DrawingVersion] })
  @OneToMany(() => DrawingVersion, (version) => version.drawing, { cascade: true })
  versions: DrawingVersion[];

  @ApiProperty({ description: 'Comments on the drawing', type: () => [DrawingComment] })
  @OneToMany(() => DrawingComment, (comment) => comment.drawing, { cascade: true })
  comments: DrawingComment[];

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
