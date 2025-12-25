import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CustomerProfile } from './customer-profile.entity';
import { User } from '../../user/entities/user.entity';

export enum CustomerDocumentType {
  REGISTRATION_CERT = 'registration_cert',
  TAX_CLEARANCE = 'tax_clearance',
  BEE_CERT = 'bee_cert',
  INSURANCE = 'insurance',
  PROOF_OF_ADDRESS = 'proof_of_address',
  OTHER = 'other',
}

export enum CustomerDocumentValidationStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
  FAILED = 'failed',
  MANUAL_REVIEW = 'manual_review',
}

@Entity('customer_documents')
export class CustomerDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CustomerProfile, (profile) => profile.documents)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerProfile;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: CustomerDocumentType,
  })
  documentType: CustomerDocumentType;

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
    enum: CustomerDocumentValidationStatus,
    default: CustomerDocumentValidationStatus.PENDING,
  })
  validationStatus: CustomerDocumentValidationStatus;

  @Column({ name: 'validation_notes', type: 'text', nullable: true, default: null })
  validationNotes: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;

  @Column({ name: 'reviewed_by_id', nullable: true })
  reviewedById: number | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'is_required', default: true })
  isRequired: boolean;

  @Column({ name: 'ocr_extracted_data', type: 'jsonb', nullable: true })
  ocrExtractedData: {
    vatNumber?: string;
    registrationNumber?: string;
    companyName?: string;
    streetAddress?: string;
    city?: string;
    provinceState?: string;
    postalCode?: string;
    rawText?: string;
    confidence?: string;
  } | null;

  @Column({ name: 'ocr_processed_at', type: 'timestamp', nullable: true })
  ocrProcessedAt: Date | null;

  @Column({ name: 'ocr_failed', default: false })
  ocrFailed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
