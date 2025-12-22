import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerProfile } from './customer-profile.entity';

export enum SessionInvalidationReason {
  LOGOUT = 'logout',
  NEW_LOGIN = 'new_login',
  EXPIRED = 'expired',
  ADMIN_RESET = 'admin_reset',
  DEVICE_RESET = 'device_reset',
  ACCOUNT_SUSPENDED = 'account_suspended',
}

@Entity('customer_sessions')
@Index(['sessionToken'], { unique: true })
@Index(['customerProfileId', 'isActive'])
export class CustomerSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CustomerProfile, (profile) => profile.sessions)
  @JoinColumn({ name: 'customer_profile_id' })
  customerProfile: CustomerProfile;

  @Column({ name: 'customer_profile_id' })
  customerProfileId: number;

  @Column({ name: 'session_token', length: 500, unique: true })
  sessionToken: string;

  @Column({ name: 'refresh_token', length: 500, nullable: true })
  refreshToken: string;

  @Column({ name: 'device_fingerprint', length: 500 })
  deviceFingerprint: string;

  @Column({ name: 'ip_address', length: 45 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'last_activity', type: 'timestamp' })
  lastActivity: Date;

  @Column({ name: 'invalidated_at', type: 'timestamp', nullable: true })
  invalidatedAt: Date;

  @Column({
    name: 'invalidation_reason',
    type: 'enum',
    enum: SessionInvalidationReason,
    nullable: true,
  })
  invalidationReason: SessionInvalidationReason;
}
