import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CrmSyncLogRepository } from "./crm-sync-log.repository";
import { CrmSyncLog } from "./entities/crm-sync-log.entity";

@Injectable()
export class PostgresCrmSyncLogRepository
  extends TypeOrmCrudRepository<CrmSyncLog>
  implements CrmSyncLogRepository
{
  constructor(@InjectRepository(CrmSyncLog) repository: Repository<CrmSyncLog>) {
    super(repository);
  }

  async findByConfigPaginated(
    configId: number,
    limit: number,
    offset: number,
  ): Promise<{ logs: CrmSyncLog[]; total: number }> {
    const [logs, total] = await this.repository.findAndCount({
      where: { configId },
      order: { startedAt: "DESC" },
      take: limit,
      skip: offset,
    });
    return { logs, total };
  }
}
