import { CrudRepository } from "../lib/persistence/crud-repository";
import { User } from "../user/entities/user.entity";
import { AuditLog } from "./entities/audit-log.entity";

export interface AuditLogQueryParams {
  entityType?: string;
  entityId?: number;
  action?: string;
  performedByUserId?: number;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export abstract class AuditLogRepository extends CrudRepository<AuditLog> {
  abstract findUserById(userId: number): Promise<User | null>;
  abstract findByEntity(entityType: string, entityId: number): Promise<AuditLog[]>;
  abstract findAllPaginated(
    params: AuditLogQueryParams,
  ): Promise<{ data: AuditLog[]; total: number }>;
  abstract findEntityHistory(
    entityType: string,
    entityId: number,
    limit: number,
  ): Promise<AuditLog[]>;
  abstract findUserActivity(
    userId: number,
    fromDate: Date | null,
    toDate: Date | null,
    limit: number,
  ): Promise<AuditLog[]>;
  abstract findRecentWithPerformedBy(limit: number): Promise<AuditLog[]>;
}
