import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SageConnection } from "./entities/sage-connection.entity";
import { SageConnectionRepository } from "./sage-connection.repository";

@Injectable()
export class PostgresSageConnectionRepository
  extends TypeOrmCrudRepository<SageConnection>
  implements SageConnectionRepository
{
  constructor(@InjectRepository(SageConnection) repository: Repository<SageConnection>) {
    super(repository);
  }

  instantiate(data: DeepPartial<SageConnection>): SageConnection {
    return this.repository.create(data);
  }

  findByAppKey(appKey: string): Promise<SageConnection | null> {
    return this.repository.findOne({ where: { appKey } });
  }

  async updateByAppKey(appKey: string, patch: DeepPartial<SageConnection>): Promise<void> {
    await this.repository.update({ appKey }, patch as QueryDeepPartialEntity<SageConnection>);
  }
}
