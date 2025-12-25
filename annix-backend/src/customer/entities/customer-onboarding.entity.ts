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
import { CustomerProfile } from './customer-profile.entity';
import { User } from '../../user/entities/user.entity';

export enum CustomerOnboardingStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('customer_onboarding')
export class CustomerOnboarding {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => CustomerProfile, (profile) => profile.onboarding)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerProfile;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CustomerOnboardingStatus,
    default: CustomerOnboardingStatus.DRAFT,
  })
  status: CustomerOnboardingStatus;

  @Column({ name: 'company_details_complete', default: false })
  companyDetailsComplete: boolean;

  @Column({ name: 'documents_complete', default: false })
  documentsComplete: boolean;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;

  @Column({ name: 'reviewed_by_id', nullable: true })
  reviewedById: number | null;

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
