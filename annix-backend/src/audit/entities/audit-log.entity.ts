import { ApiProperty } from "@nestjs/swagger";
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

export class AuditLog {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Entity type (drawing, boq, rfq, etc.)",
    example: "drawing",
  })
  entityType: string;

  @ApiProperty({ description: "Entity ID", example: 1, required: false })
  entityId?: number;

  @ApiProperty({ description: "Action performed", enum: AuditAction })
  action: AuditAction;

  @ApiProperty({
    description: "Previous values before the action",
    required: false,
  })
  oldValues?: Record<string, any>;

  @ApiProperty({ description: "New values after the action", required: false })
  newValues?: Record<string, any>;

  @ApiProperty({
    description: "User who performed the action",
    type: () => User,
    required: false,
  })
  performedBy?: User;

  @ApiProperty({ description: "App that generated this log entry", required: false })
  appName: string | null;

  @ApiProperty({ description: "App-specific action name (free-form)", required: false })
  subAction: string | null;

  @ApiProperty({ description: "Free-form details (per-app context)", required: false })
  details: Record<string, unknown> | null;

  @ApiProperty({ description: "Company ID (unified)", required: false })
  companyId: number | null;

  @ApiProperty({ description: "Raw user ID (for non-unified user references)", required: false })
  userIdRaw: number | null;

  @ApiProperty({ description: "IP address of the request", required: false })
  ipAddress?: string;

  @ApiProperty({ description: "User agent string", required: false })
  userAgent?: string;

  @ApiProperty({ description: "Timestamp of the action" })
  timestamp: Date;
}
