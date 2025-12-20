import { AuditAction } from '../entities/audit-log.entity';
import { User } from '../../user/entities/user.entity';

export class CreateAuditLogDto {
  entityType: string;
  entityId: number;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  performedBy?: User;
  ipAddress?: string;
  userAgent?: string;
}
