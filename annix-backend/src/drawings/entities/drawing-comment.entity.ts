import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Drawing } from './drawing.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum CommentType {
  GENERAL = 'general',
  ANNOTATION = 'annotation',
  REVIEW_NOTE = 'review_note',
  CHANGE_REQUEST = 'change_request',
  APPROVAL_NOTE = 'approval_note',
}

@Entity('drawing_comments')
@Index(['drawing'])
export class DrawingComment {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Parent drawing', type: () => Drawing })
  @ManyToOne(() => Drawing, (drawing) => drawing.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drawing_id' })
  drawing: Drawing;

  @ApiProperty({ description: 'User who made the comment', type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Comment text' })
  @Column({ name: 'comment_text', type: 'text' })
  commentText: string;

  @ApiProperty({ description: 'Type of comment', enum: CommentType })
  @Column({ name: 'comment_type', type: 'enum', enum: CommentType, default: CommentType.GENERAL })
  commentType: CommentType;

  @ApiProperty({ description: 'X position for annotation', required: false })
  @Column({ name: 'position_x', type: 'decimal', precision: 10, scale: 2, nullable: true })
  positionX?: number;

  @ApiProperty({ description: 'Y position for annotation', required: false })
  @Column({ name: 'position_y', type: 'decimal', precision: 10, scale: 2, nullable: true })
  positionY?: number;

  @ApiProperty({ description: 'Page number for multi-page documents', required: false })
  @Column({ name: 'page_number', nullable: true })
  pageNumber?: number;

  @ApiProperty({ description: 'Whether the comment is resolved' })
  @Column({ name: 'is_resolved', default: false })
  isResolved: boolean;

  @ApiProperty({ description: 'Parent comment for replies', type: () => DrawingComment, required: false })
  @ManyToOne(() => DrawingComment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment?: DrawingComment;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
