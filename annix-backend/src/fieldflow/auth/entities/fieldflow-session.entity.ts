import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SessionInvalidationReason } from "../../../shared/enums";
import { User } from "../../../user/entities/user.entity";

@Entity("fieldflow_sessions")
@Index(["sessionToken"], { unique: true })
@Index(["userId", "isActive"])
export class FieldFlowSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "session_token", length: 500, unique: true })
  sessionToken: string;

  @Column({ name: "refresh_token", length: 500, nullable: true })
  refreshToken: string;

  @Column({ name: "ip_address", length: 45 })
  ipAddress: string;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent: string;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @Column({ name: "last_activity", type: "timestamp" })
  lastActivity: Date;

  @Column({ name: "invalidated_at", type: "timestamp", nullable: true })
  invalidatedAt: Date;

  @Column({
    name: "invalidation_reason",
    type: "enum",
    enum: SessionInvalidationReason,
    enumName: "fieldflow_session_invalidation_reason_enum",
    nullable: true,
  })
  invalidationReason: SessionInvalidationReason;
}
