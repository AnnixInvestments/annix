import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Drawing } from './drawing.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('drawing_versions')
@Index(['drawing'])
export class DrawingVersion {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Parent drawing', type: () => Drawing })
  @ManyToOne(() => Drawing, (drawing) => drawing.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drawing_id' })
  drawing: Drawing;

  @ApiProperty({ description: 'Version number', example: 1 })
  @Column({ name: 'version_number' })
  versionNumber: number;

  @ApiProperty({ description: 'File path in storage' })
  @Column({ name: 'file_path', length: 500 })
  filePath: string;

  @ApiProperty({ description: 'Original filename' })
  @Column({ name: 'original_filename', length: 255 })
  originalFilename: string;

  @ApiProperty({ description: 'File size in bytes', example: 1024000 })
  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @ApiProperty({ description: 'Change notes for this version', required: false })
  @Column({ name: 'change_notes', type: 'text', nullable: true })
  changeNotes?: string;

  @ApiProperty({ description: 'User who uploaded this version', type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy: User;

  @ApiProperty({ description: 'Upload date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
