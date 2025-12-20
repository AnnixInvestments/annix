import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

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
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action,
      oldValues: dto.oldValues,
      newValues: dto.newValues,
      performedBy: dto.performedBy,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async findByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      relations: ['performedBy'],
      order: { timestamp: 'DESC' },
    });
  }

  async findAll(query: AuditLogQuery): Promise<{ data: AuditLog[]; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.performedByUserId) {
      where.performedBy = { id: query.performedByUserId };
    }

    if (query.fromDate && query.toDate) {
      where.timestamp = Between(query.fromDate, query.toDate);
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      relations: ['performedBy'],
      order: { timestamp: 'DESC' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    return { data, total };
  }

  async getEntityHistory(
    entityType: string,
    entityId: number,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      relations: ['performedBy'],
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getUserActivity(
    userId: number,
    fromDate?: Date,
    toDate?: Date,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = {
      performedBy: { id: userId },
    };

    if (fromDate && toDate) {
      where.timestamp = Between(fromDate, toDate);
    }

    return this.auditLogRepository.find({
      where,
      relations: ['performedBy'],
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
