import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CustomerProfile } from './customer-profile.entity';

export enum LoginFailureReason {
  INVALID_CREDENTIALS = 'invalid_credentials',
  DEVICE_MISMATCH = 'device_mismatch',
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_PENDING = 'account_pending',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
  TOO_MANY_ATTEMPTS = 'too_many_attempts',
  EMAIL_NOT_VERIFIED = 'email_not_verified',
}

@Entity('customer_login_attempts')
@Index(['customerProfileId', 'attemptTime'])
@Index(['email', 'attemptTime'])
export class CustomerLoginAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CustomerProfile, (profile) => profile.loginAttempts, { nullable: true })
  @JoinColumn({ name: 'customer_profile_id' })
  customerProfile: CustomerProfile;

  @Column({ name: 'customer_profile_id', nullable: true })
  customerProfileId: number;

  @Column({ name: 'email', length: 255 })
  email: string;

  @Column({ name: 'success', default: false })
  success: boolean;

  @Column({
    name: 'failure_reason',
    type: 'enum',
    enum: LoginFailureReason,
    nullable: true,
  })
  failureReason: LoginFailureReason;

  @Column({ name: 'device_fingerprint', length: 500, nullable: true })
  deviceFingerprint: string;

  @Column({ name: 'ip_address', length: 45 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'ip_mismatch_warning', default: false })
  ipMismatchWarning: boolean;

  @CreateDateColumn({ name: 'attempt_time' })
  attemptTime: Date;
}
