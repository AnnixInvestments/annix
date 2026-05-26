import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, FindOptionsWhere, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { User } from "../user/entities/user.entity";
import { AuditLogQueryParams, AuditLogRepository } from "./audit.repository";
import { AuditLog } from "./entities/audit-log.entity";

@Injectable()
export class PostgresAuditLogRepository
  extends TypeOrmCrudRepository<AuditLog>
  implements AuditLogRepository
{
  constructor(
    @InjectRepository(AuditLog) repository: Repository<AuditLog>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    super(repository);
  }

  findUserById(userId: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  findByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    return this.repository.find({
      where: { entityType, entityId },
      relations: ["performedBy"],
      order: { timestamp: "DESC" },
    });
  }

  async findAllPaginated(
    params: AuditLogQueryParams,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.action) where.action = params.action as AuditLog["action"];
    if (params.performedByUserId) {
      where.performedBy = { id: params.performedByUserId };
    }
    if (params.fromDate && params.toDate) {
      where.timestamp = Between(params.fromDate, params.toDate);
    }

    const [data, total] = await this.repository.findAndCount({
      where,
      relations: ["performedBy"],
      order: { timestamp: "DESC" },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
    });

    return { data, total };
  }

  findEntityHistory(entityType: string, entityId: number, limit: number): Promise<AuditLog[]> {
    return this.repository.find({
      where: { entityType, entityId },
      relations: ["performedBy"],
      order: { timestamp: "DESC" },
      take: limit,
    });
  }

  findUserActivity(
    userId: number,
    fromDate: Date | null,
    toDate: Date | null,
    limit: number,
  ): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = {
      performedBy: { id: userId },
    };

    if (fromDate && toDate) {
      where.timestamp = Between(fromDate, toDate);
    }

    return this.repository.find({
      where,
      relations: ["performedBy"],
      order: { timestamp: "DESC" },
      take: limit,
    });
  }

  findRecentWithPerformedBy(limit: number): Promise<AuditLog[]> {
    return this.repository.find({
      order: { timestamp: "DESC" },
      take: limit,
      relations: ["performedBy"],
    });
  }
}
