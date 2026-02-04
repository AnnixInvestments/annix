import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface RegionCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

@Entity('nix_extraction_regions')
@Index(['documentCategory', 'fieldName'])
export class NixExtractionRegion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'document_category', length: 50 })
  documentCategory: string;

  @Column({ name: 'field_name', length: 50 })
  fieldName: string;

  @Column({ name: 'region_coordinates', type: 'jsonb' })
  regionCoordinates: RegionCoordinates;

  @Column({ name: 'label_coordinates', type: 'jsonb', nullable: true })
  labelCoordinates: RegionCoordinates | null;

  @Column({
    name: 'label_text',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  labelText: string | null;

  @Column({
    name: 'extraction_pattern',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  extractionPattern: string | null;

  @Column({
    name: 'sample_value',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  sampleValue: string | null;

  @Column({ name: 'confidence_threshold', type: 'float', default: 0.7 })
  confidenceThreshold: number;

  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount: number;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_custom_field', type: 'boolean', default: false })
  isCustomField: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
