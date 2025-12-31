import { AuditAction } from '../entities/audit-log.entity';
import { User } from '../../user/entities/user.entity';

export class CreateAuditLogDto {
  entityType: string;
  entityId?: number | null;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  performedBy?: User;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * DTO for admin audit logging with extended fields
 */
export class AdminAuditLogDto {
  userId?: number | null;
  userType?: string;
  action: AuditAction | string;
  entityType: string;
  entityId?: number | null;
  metadata?: Record<string, any>;
  ipAddress?: string;
}
