import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { SupplierCompany } from './supplier-company.entity';
import { SupplierDeviceBinding } from './supplier-device-binding.entity';
import { SupplierSession } from './supplier-session.entity';
import { SupplierLoginAttempt } from './supplier-login-attempt.entity';
import { SupplierOnboarding } from './supplier-onboarding.entity';
import { SupplierDocument } from './supplier-document.entity';

export enum SupplierAccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

@Entity('supplier_profiles')
export class SupplierProfile {
  @PrimaryGeneratedColumn()
  id: number;

  // Links to existing User entity (one-to-one)
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  // Links to SupplierCompany (many-to-one, nullable for initial registration)
  @ManyToOne(() => SupplierCompany, (company) => company.profiles, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: SupplierCompany;

  @Column({ name: 'company_id', nullable: true })
  companyId: number;

  // Personal details (nullable for initial registration)
  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName: string;

  @Column({ name: 'job_title', length: 100, nullable: true })
  jobTitle: string;

  @Column({ name: 'direct_phone', length: 30, nullable: true })
  directPhone: string;

  @Column({ name: 'mobile_phone', length: 30, nullable: true })
  mobilePhone: string;

  // Account status
  @Column({
    name: 'account_status',
    type: 'enum',
    enum: SupplierAccountStatus,
    default: SupplierAccountStatus.PENDING,
  })
  accountStatus: SupplierAccountStatus;

  // Email verification
  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'email_verification_token', type: 'varchar', length: 500, nullable: true })
  emailVerificationToken: string | null;

  @Column({ name: 'email_verification_expires', type: 'timestamp', nullable: true })
  emailVerificationExpires: Date | null;

  // Suspension tracking
  @Column({ name: 'suspension_reason', type: 'text', nullable: true })
  suspensionReason?: string | null;

  @Column({ name: 'suspended_at', type: 'timestamp', nullable: true })
  suspendedAt?: Date | null;

  @Column({ name: 'suspended_by', type: 'int', nullable: true })
  suspendedBy?: number | null;

  // Device bindings
  @OneToMany(() => SupplierDeviceBinding, (binding) => binding.supplierProfile)
  deviceBindings: SupplierDeviceBinding[];

  // Sessions
  @OneToMany(() => SupplierSession, (session) => session.supplierProfile)
  sessions: SupplierSession[];

  // Login attempts
  @OneToMany(() => SupplierLoginAttempt, (attempt) => attempt.supplierProfile)
  loginAttempts: SupplierLoginAttempt[];

  // Onboarding
  @OneToOne(() => SupplierOnboarding, (onboarding) => onboarding.supplier)
  onboarding: SupplierOnboarding;

  // Documents
  @OneToMany(() => SupplierDocument, (document) => document.supplier)
  documents: SupplierDocument[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'terms_accepted_at', type: 'timestamp', nullable: true })
  termsAcceptedAt: Date;

  @Column({ name: 'security_policy_accepted_at', type: 'timestamp', nullable: true })
  securityPolicyAcceptedAt: Date;
}
