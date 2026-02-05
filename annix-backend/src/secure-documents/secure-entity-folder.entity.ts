import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export type EntityType = 'customer' | 'supplier';

@Entity('secure_entity_folders')
@Index(['entityType', 'entityId'], { unique: true })
export class SecureEntityFolder {
  @ApiProperty({ description: 'Primary key' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Type of entity (customer or supplier)',
    enum: ['customer', 'supplier'],
    example: 'customer',
  })
  @Column({ name: 'entity_type', type: 'varchar', length: 20 })
  entityType: EntityType;

  @ApiProperty({
    description: 'ID of the customer or supplier',
    example: 5,
  })
  @Column({ name: 'entity_id' })
  entityId: number;

  @ApiProperty({
    description: 'Display name for the folder',
    example: 'Acme Corp (ID: 5)',
  })
  @Column({ name: 'folder_name', length: 255 })
  folderName: string;

  @ApiProperty({
    description: 'Full path in secure documents structure',
    example: 'Customers/Acme Corp (ID: 5)',
  })
  @Column({ name: 'secure_folder_path', length: 500 })
  secureFolderPath: string;

  @ApiProperty({
    description: 'Whether the folder is active (visible to admins)',
    example: true,
  })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when folder was deactivated',
    example: null,
  })
  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({
    description: 'Reason for deactivation',
    example: 'Account suspended: Non-payment',
  })
  @Column({ name: 'deletion_reason', type: 'varchar', length: 255, nullable: true })
  deletionReason: string | null;
}
