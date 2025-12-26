import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('admin_sessions')
export class AdminSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true, name: 'session_token' })
  sessionToken: string; // UUID

  @Column({ name: 'client_ip' })
  clientIp: string;

  @Column({ name: 'user_agent', type: 'text' })
  userAgent: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date; // 7 days

  @Column({ default: false, name: 'is_revoked' })
  isRevoked: boolean;

  @Column({ nullable: true, name: 'revoked_at', type: 'timestamp' })
  revokedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'last_active_at' })
  lastActiveAt: Date;
}
