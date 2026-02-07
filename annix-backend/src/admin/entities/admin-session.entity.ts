import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

@Entity("admin_sessions")
export class AdminSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "session_token", unique: true })
  sessionToken: string; // UUID

  @Column({ name: "client_ip" })
  clientIp: string;

  @Column({ name: "user_agent", type: "text" })
  userAgent: string;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @Column({ name: "is_revoked", default: false })
  isRevoked: boolean;

  @Column({ name: "revoked_at", type: "timestamp", nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "last_active_at" })
  lastActiveAt: Date;
}
