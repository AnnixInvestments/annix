import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierProfile } from './supplier-profile.entity';
import { User } from '../../user/entities/user.entity';

export enum SupplierDocumentType {
  REGISTRATION_CERT = 'registration_cert',
  VAT_CERT = 'vat_cert',
  TAX_CLEARANCE = 'tax_clearance',
  BEE_CERT = 'bee_cert',
  ISO_CERT = 'iso_cert',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

export enum SupplierDocumentValidationStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
  FAILED = 'failed',
  MANUAL_REVIEW = 'manual_review',
}

@Entity('supplier_documents')
export class SupplierDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SupplierProfile, (profile) => profile.documents)
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierProfile;

  @Column({ name: 'supplier_id' })
  supplierId: number;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: SupplierDocumentType,
  })
  documentType: SupplierDocumentType;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'file_path', length: 500 })
  filePath: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ name: 'uploaded_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  uploadedAt: Date;

  @Column({
    name: 'validation_status',
    type: 'enum',
    enum: SupplierDocumentValidationStatus,
    default: SupplierDocumentValidationStatus.PENDING,
  })
  validationStatus: SupplierDocumentValidationStatus;

  @Column({ name: 'validation_notes', type: 'text', nullable: true, default: null })
  validationNotes: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedById: number;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'is_required', default: true })
  isRequired: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
