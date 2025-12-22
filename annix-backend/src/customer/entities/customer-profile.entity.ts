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
import { CustomerCompany } from './customer-company.entity';
import { CustomerDeviceBinding } from './customer-device-binding.entity';
import { CustomerSession } from './customer-session.entity';
import { CustomerLoginAttempt } from './customer-login-attempt.entity';
import { CustomerOnboarding } from './customer-onboarding.entity';
import { CustomerDocument } from './customer-document.entity';

export enum CustomerAccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

export enum CustomerRole {
  CUSTOMER_ADMIN = 'customer_admin',
  CUSTOMER_STANDARD = 'customer_standard',
}

@Entity('customer_profiles')
export class CustomerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  // Links to existing User entity (one-to-one)
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  // Links to CustomerCompany (many-to-one)
  @ManyToOne(() => CustomerCompany, (company) => company.profiles)
  @JoinColumn({ name: 'company_id' })
  company: CustomerCompany;

  @Column({ name: 'company_id' })
  companyId: number;

  // Personal details
  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'job_title', length: 100, nullable: true })
  jobTitle: string;

  @Column({ name: 'direct_phone', length: 30, nullable: true })
  directPhone: string;

  @Column({ name: 'mobile_phone', length: 30, nullable: true })
  mobilePhone: string;

  // Role within customer organization
  @Column({
    name: 'role',
    type: 'enum',
    enum: CustomerRole,
    default: CustomerRole.CUSTOMER_ADMIN,
  })
  role: CustomerRole;

  // Account status
  @Column({
    name: 'account_status',
    type: 'enum',
    enum: CustomerAccountStatus,
    default: CustomerAccountStatus.PENDING,
  })
  accountStatus: CustomerAccountStatus;

  // Email verification
  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'email_verification_token', type: 'varchar', length: 500, nullable: true })
  emailVerificationToken: string | null;

  @Column({ name: 'email_verification_expires', type: 'timestamp', nullable: true })
  emailVerificationExpires: Date | null;

  @Column({ name: 'suspension_reason', type: 'text', nullable: true })
  suspensionReason?: string | null;

  @Column({ name: 'suspended_at', type: 'timestamp', nullable: true })
  suspendedAt?: Date | null;

  @Column({ name: 'suspended_by', type: 'int', nullable: true })
  suspendedBy?: number | null; // Admin user ID

  // Device bindings
  @OneToMany(() => CustomerDeviceBinding, (binding) => binding.customerProfile)
  deviceBindings: CustomerDeviceBinding[];

  // Sessions
  @OneToMany(() => CustomerSession, (session) => session.customerProfile)
  sessions: CustomerSession[];

  // Login attempts
  @OneToMany(() => CustomerLoginAttempt, (attempt) => attempt.customerProfile)
  loginAttempts: CustomerLoginAttempt[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'terms_accepted_at', type: 'timestamp', nullable: true })
  termsAcceptedAt: Date;

  @Column({ name: 'security_policy_accepted_at', type: 'timestamp', nullable: true })
  securityPolicyAcceptedAt: Date;

  // Onboarding
  @OneToOne(() => CustomerOnboarding, (onboarding) => onboarding.customer)
  onboarding: CustomerOnboarding;

  // Documents
  @OneToMany(() => CustomerDocument, (document) => document.customer)
  documents: CustomerDocument[];
}
