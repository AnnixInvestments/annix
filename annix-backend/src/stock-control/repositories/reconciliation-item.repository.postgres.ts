import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ReconciliationItem } from "../entities/reconciliation-item.entity";
import { ReconciliationItemRepository } from "./reconciliation-item.repository";

@Injectable()
export class PostgresReconciliationItemRepository
  extends TypeOrmCrudRepository<ReconciliationItem>
  implements ReconciliationItemRepository
{
  constructor(
    @InjectRepository(ReconciliationItem)
    repository: Repository<ReconciliationItem>,
  ) {
    super(repository);
  }

  findForJobCardOrdered(companyId: number, jobCardId: number): Promise<ReconciliationItem[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationItem[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<ReconciliationItem | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  async maxSortOrder(companyId: number, jobCardId: number): Promise<number> {
    const maxSort = await this.repository
      .createQueryBuilder("ri")
      .select("COALESCE(MAX(ri.sort_order), -1)", "maxSort")
      .where("ri.company_id = :companyId AND ri.job_card_id = :jobCardId", {
        companyId,
        jobCardId,
      })
      .getRawOne();
    return maxSort?.maxSort ?? -1;
  }

  buildMany(rows: DeepPartial<ReconciliationItem>[]): ReconciliationItem[] {
    return this.repository.create(rows as TypeOrmDeepPartial<ReconciliationItem>[]);
  }

  saveMany(entities: ReconciliationItem[]): Promise<ReconciliationItem[]> {
    return this.repository.save(entities);
  }
}
