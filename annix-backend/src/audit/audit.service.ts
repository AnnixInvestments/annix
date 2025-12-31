import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { CreateAuditLogDto, AdminAuditLogDto } from './dto/create-audit-log.dto';
import { User } from '../user/entities/user.entity';

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
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async log(dto: CreateAuditLogDto | AdminAuditLogDto): Promise<AuditLog> {
    // Handle AdminAuditLogDto format
    if ('userId' in dto || 'metadata' in dto) {
      const adminDto = dto as AdminAuditLogDto;
      let performedBy: User | undefined;

      if (adminDto.userId) {
        performedBy = await this.userRepository.findOne({ where: { id: adminDto.userId } }) || undefined;
      }

      // Map string action to AuditAction enum if needed
      let action: AuditAction;
      if (typeof adminDto.action === 'string') {
        action = (AuditAction as any)[adminDto.action.toUpperCase().replace(/ /g, '_')] || AuditAction.UPDATE;
      } else {
        action = adminDto.action;
      }

      const auditLog = this.auditLogRepository.create({
        entityType: adminDto.entityType,
        entityId: adminDto.entityId ?? 0,
        action,
        newValues: adminDto.metadata,
        performedBy,
        ipAddress: adminDto.ipAddress,
      });

      return this.auditLogRepository.save(auditLog);
    }

    // Handle standard CreateAuditLogDto format
    const standardDto = dto as CreateAuditLogDto;
    const auditLog = this.auditLogRepository.create({
      entityType: standardDto.entityType,
      entityId: standardDto.entityId ?? 0,
      action: standardDto.action,
      oldValues: standardDto.oldValues,
      newValues: standardDto.newValues,
      performedBy: standardDto.performedBy,
      ipAddress: standardDto.ipAddress,
      userAgent: standardDto.userAgent,
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
