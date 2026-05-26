import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CrmConfigRepository } from "./crm-config.repository";
import { CrmConfig, CrmType } from "./entities/crm-config.entity";

@Injectable()
export class PostgresCrmConfigRepository
  extends TypeOrmCrudRepository<CrmConfig>
  implements CrmConfigRepository
{
  constructor(@InjectRepository(CrmConfig) repository: Repository<CrmConfig>) {
    super(repository);
  }

  findActive(): Promise<CrmConfig[]> {
    return this.repository.find({ where: { isActive: true } });
  }

  findByUserAndType(userId: number, crmType: CrmType): Promise<CrmConfig | null> {
    return this.repository.findOne({ where: { userId, crmType } });
  }

  findByIdAndUser(id: number, userId: number): Promise<CrmConfig | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  findByUser(userId: number): Promise<CrmConfig[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }
}
