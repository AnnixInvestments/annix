import { Injectable } from "@nestjs/common";
import { AuditLogRepository } from "./audit.repository";
import { AdminAuditLogDto, AppAuditLogDto, CreateAuditLogDto } from "./dto/create-audit-log.dto";
import { AuditAction, AuditLog } from "./entities/audit-log.entity";

export interface AuditLogQuery {
  entityType?: string;
  entityId?: number;
  action?: AuditAction;
  performedByUserId?: number;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(dto: CreateAuditLogDto | AdminAuditLogDto): Promise<AuditLog> {
    if ("userId" in dto || "metadata" in dto) {
      const adminDto = dto as AdminAuditLogDto;
      let performedBy: import("../user/entities/user.entity").User | undefined;

      if (adminDto.userId) {
        performedBy = (await this.auditLogRepository.findUserById(adminDto.userId)) || undefined;
      }

      let action: AuditAction;
      if (typeof adminDto.action === "string") {
        action =
          (AuditAction as Record<string, AuditAction>)[
            adminDto.action.toUpperCase().replace(/ /g, "_")
          ] || AuditAction.UPDATE;
      } else {
        action = adminDto.action as AuditAction;
      }

      return this.auditLogRepository.create({
        entityType: adminDto.entityType,
        entityId: adminDto.entityId ?? 0,
        action,
        newValues: adminDto.metadata,
        performedBy: performedBy as any,
        ipAddress: adminDto.ipAddress,
      });
    }

    const standardDto = dto as CreateAuditLogDto;
    return this.auditLogRepository.create({
      entityType: standardDto.entityType,
      entityId: standardDto.entityId ?? 0,
      action: standardDto.action,
      oldValues: standardDto.oldValues,
      newValues: standardDto.newValues,
      performedBy: standardDto.performedBy,
      ipAddress: standardDto.ipAddress,
      userAgent: standardDto.userAgent,
    });
  }

  async logApp(dto: AppAuditLogDto): Promise<AuditLog> {
    return this.auditLogRepository.create({
      entityType: dto.entityType || "app",
      entityId: dto.entityId ?? 0,
      action: AuditAction.UPDATE,
      appName: dto.appName,
      subAction: dto.subAction,
      companyId: dto.companyId ?? null,
      userIdRaw: dto.userId ?? null,
      details: dto.details ?? null,
    });
  }

  async findByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    return this.auditLogRepository.findByEntity(entityType, entityId);
  }

  async findAll(query: AuditLogQuery): Promise<{ data: AuditLog[]; total: number }> {
    return this.auditLogRepository.findAllPaginated({
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action,
      performedByUserId: query.performedByUserId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      limit: query.limit,
      offset: query.offset,
    });
  }

  async getEntityHistory(
    entityType: string,
    entityId: number,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findEntityHistory(entityType, entityId, limit);
  }

  async getUserActivity(
    userId: number,
    fromDate?: Date,
    toDate?: Date,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.findUserActivity(
      userId,
      fromDate ?? null,
      toDate ?? null,
      limit,
    );
  }
}
