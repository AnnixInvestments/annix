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
import { ApiProperty } from '@nestjs/swagger';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  SUBMIT = 'submit',
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_CHANGES = 'request_changes',
  ASSIGN_REVIEWER = 'assign_reviewer',
  ADD_COMMENT = 'add_comment',
  RESOLVE_COMMENT = 'resolve_comment',
}

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['timestamp'])
export class AuditLog {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Entity type (drawing, boq, rfq, etc.)', example: 'drawing' })
  @Column({ name: 'entity_type', length: 100 })
  entityType: string;

  @ApiProperty({ description: 'Entity ID', example: 1 })
  @Column({ name: 'entity_id' })
  entityId: number;

  @ApiProperty({ description: 'Action performed', enum: AuditAction })
  @Column({ name: 'action', type: 'enum', enum: AuditAction })
  action: AuditAction;

  @ApiProperty({ description: 'Previous values before the action', required: false })
  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues?: Record<string, any>;

  @ApiProperty({ description: 'New values after the action', required: false })
  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues?: Record<string, any>;

  @ApiProperty({ description: 'User who performed the action', type: () => User, required: false })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by_user_id' })
  performedBy?: User;

  @ApiProperty({ description: 'IP address of the request', required: false })
  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @ApiProperty({ description: 'User agent string', required: false })
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @ApiProperty({ description: 'Timestamp of the action' })
  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
