import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierProfile } from './supplier-profile.entity';

export enum SupplierLoginFailureReason {
  INVALID_CREDENTIALS = 'invalid_credentials',
  DEVICE_MISMATCH = 'device_mismatch',
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_PENDING = 'account_pending',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
  TOO_MANY_ATTEMPTS = 'too_many_attempts',
  EMAIL_NOT_VERIFIED = 'email_not_verified',
}

@Entity('supplier_login_attempts')
@Index(['supplierProfileId', 'attemptTime'])
@Index(['email', 'attemptTime'])
export class SupplierLoginAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SupplierProfile, (profile) => profile.loginAttempts, { nullable: true })
  @JoinColumn({ name: 'supplier_profile_id' })
  supplierProfile: SupplierProfile;

  @Column({ name: 'supplier_profile_id', type: 'int', nullable: true })
  supplierProfileId: number | null;

  @Column({ name: 'email', length: 255 })
  email: string;

  @Column({ name: 'success', default: false })
  success: boolean;

  @Column({
    name: 'failure_reason',
    type: 'enum',
    enum: SupplierLoginFailureReason,
    nullable: true,
  })
  failureReason: SupplierLoginFailureReason | null;

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
