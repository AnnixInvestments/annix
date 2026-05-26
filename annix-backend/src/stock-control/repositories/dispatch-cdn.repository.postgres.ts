import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DispatchCdn } from "../entities/dispatch-cdn.entity";
import { DispatchCdnRepository } from "./dispatch-cdn.repository";

@Injectable()
export class PostgresDispatchCdnRepository
  extends TypeOrmCrudRepository<DispatchCdn>
  implements DispatchCdnRepository
{
  constructor(@InjectRepository(DispatchCdn) repository: Repository<DispatchCdn>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<DispatchCdn[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });
  }

  findOneForCompany(cdnId: number, companyId: number): Promise<DispatchCdn | null> {
    return this.repository.findOne({
      where: { id: cdnId, companyId },
    });
  }

  async updateById(cdnId: number, changes: DeepPartial<DispatchCdn>): Promise<void> {
    await this.repository.update(cdnId, changes as QueryDeepPartialEntity<DispatchCdn>);
  }
}
