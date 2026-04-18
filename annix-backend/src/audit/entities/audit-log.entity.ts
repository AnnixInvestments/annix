import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum AuditAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  UPLOAD = "upload",
  DOWNLOAD = "download",
  SUBMIT = "submit",
  APPROVE = "approve",
  REJECT = "reject",
  REQUEST_CHANGES = "request_changes",
  ASSIGN_REVIEWER = "assign_reviewer",
  ADD_COMMENT = "add_comment",
  RESOLVE_COMMENT = "resolve_comment",
  // Admin-specific actions
  ADMIN_LOGIN_SUCCESS = "admin_login_success",
  ADMIN_LOGIN_FAILED = "admin_login_failed",
  ADMIN_LOGOUT = "admin_logout",
  USER_CREATED = "user_created",
  USER_UPDATED = "user_updated",
  USER_DEACTIVATED = "user_deactivated",
  USER_REACTIVATED = "user_reactivated",
}

@Entity("audit_logs")
@Index(["entityType", "entityId"])
@Index(["timestamp"])
export class AuditLog {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: "Entity type (drawing, boq, rfq, etc.)",
    example: "drawing",
  })
  @Column({ name: "entity_type", length: 100 })
  entityType: string;

  @ApiProperty({ description: "Entity ID", example: 1, required: false })
  @Column({ name: "entity_id", nullable: true })
  entityId?: number;

  @ApiProperty({ description: "Action performed", enum: AuditAction })
  @Column({ name: "action", type: "enum", enum: AuditAction })
  action: AuditAction;

  @ApiProperty({
    description: "Previous values before the action",
    required: false,
  })
  @Column({ name: "old_values", type: "jsonb", nullable: true })
  oldValues?: Record<string, any>;

  @ApiProperty({ description: "New values after the action", required: false })
  @Column({ name: "new_values", type: "jsonb", nullable: true })
  newValues?: Record<string, any>;

  @ApiProperty({
    description: "User who performed the action",
    type: () => User,
    required: false,
  })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "performed_by_user_id" })
  performedBy?: User;

  @ApiProperty({ description: "App that generated this log entry", required: false })
  @Column({ name: "app_name", type: "varchar", length: 50, nullable: true })
  appName: string | null;

  @ApiProperty({ description: "App-specific action name (free-form)", required: false })
  @Column({ name: "sub_action", type: "varchar", length: 100, nullable: true })
  subAction: string | null;

  @ApiProperty({ description: "Free-form details (per-app context)", required: false })
  @Column({ type: "jsonb", nullable: true })
  details: Record<string, unknown> | null;

  @ApiProperty({ description: "Company ID (unified)", required: false })
  @Column({ name: "company_id", type: "int", nullable: true })
  companyId: number | null;

  @ApiProperty({ description: "Raw user ID (for non-unified user references)", required: false })
  @Column({ name: "user_id_raw", type: "int", nullable: true })
  userIdRaw: number | null;

  @ApiProperty({ description: "IP address of the request", required: false })
  @Column({ name: "ip_address", length: 45, nullable: true })
  ipAddress?: string;

  @ApiProperty({ description: "User agent string", required: false })
  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent?: string;

  @ApiProperty({ description: "Timestamp of the action" })
  @CreateDateColumn({ name: "timestamp" })
  timestamp: Date;
}
