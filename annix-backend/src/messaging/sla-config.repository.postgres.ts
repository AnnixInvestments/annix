import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SlaConfig } from "./entities/sla-config.entity";
import { SlaConfigRepository } from "./sla-config.repository";

@Injectable()
export class PostgresSlaConfigRepository
  extends TypeOrmCrudRepository<SlaConfig>
  implements SlaConfigRepository
{
  constructor(@InjectRepository(SlaConfig) repository: Repository<SlaConfig>) {
    super(repository);
  }

  findFirst(): Promise<SlaConfig | null> {
    return this.repository.findOne({ where: {} });
  }
}
