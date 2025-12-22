import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierProfile } from './supplier-profile.entity';
import { User } from '../../user/entities/user.entity';

export enum SupplierOnboardingStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('supplier_onboarding')
export class SupplierOnboarding {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => SupplierProfile, (profile) => profile.onboarding)
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierProfile;

  @Column({ name: 'supplier_id' })
  supplierId: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SupplierOnboardingStatus,
    default: SupplierOnboardingStatus.DRAFT,
  })
  status: SupplierOnboardingStatus;

  @Column({ name: 'company_details_complete', default: false })
  companyDetailsComplete: boolean;

  @Column({ name: 'documents_complete', default: false })
  documentsComplete: boolean;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedById: number;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true, default: null })
  rejectionReason: string | null;

  @Column({ name: 'remediation_steps', type: 'text', nullable: true, default: null })
  remediationSteps: string | null;

  @Column({ name: 'resubmission_count', default: 0 })
  resubmissionCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
