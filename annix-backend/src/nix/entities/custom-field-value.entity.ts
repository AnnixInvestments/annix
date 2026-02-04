import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('custom_field_values')
@Index(['entityType', 'entityId'])
@Index(['fieldName'])
export class CustomFieldValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entity_type', type: 'varchar', length: 20 })
  entityType: 'customer' | 'supplier';

  @Column({ name: 'entity_id', type: 'int' })
  entityId: number;

  @Column({ name: 'field_name', type: 'varchar', length: 100 })
  fieldName: string;

  @Column({ name: 'field_value', type: 'text', nullable: true })
  fieldValue: string | null;

  @Column({ name: 'document_category', type: 'varchar', length: 50 })
  documentCategory: string;

  @Column({ name: 'extracted_from_document_id', type: 'int', nullable: true })
  extractedFromDocumentId: number | null;

  @Column({
    name: 'confidence',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidence: number | null;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_by_user_id', type: 'int', nullable: true })
  verifiedByUserId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
