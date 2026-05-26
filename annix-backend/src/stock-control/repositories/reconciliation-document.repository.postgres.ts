import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ReconciliationDocument } from "../entities/reconciliation-document.entity";
import { ReconciliationDocumentRepository } from "./reconciliation-document.repository";

@Injectable()
export class PostgresReconciliationDocumentRepository
  extends TypeOrmCrudRepository<ReconciliationDocument>
  implements ReconciliationDocumentRepository
{
  constructor(
    @InjectRepository(ReconciliationDocument)
    repository: Repository<ReconciliationDocument>,
  ) {
    super(repository);
  }

  findForJobCardOrdered(companyId: number, jobCardId: number): Promise<ReconciliationDocument[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { documentCategory: "ASC", createdAt: "DESC" },
    });
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationDocument[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<ReconciliationDocument | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findById(id: number): Promise<ReconciliationDocument | null> {
    return this.repository.findOne({ where: { id } });
  }

  async updateById(id: number, changes: DeepPartial<ReconciliationDocument>): Promise<void> {
    await this.repository.update(id, changes as QueryDeepPartialEntity<ReconciliationDocument>);
  }
}
