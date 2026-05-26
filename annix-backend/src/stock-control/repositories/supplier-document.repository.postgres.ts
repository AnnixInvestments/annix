import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SupplierDocument } from "../entities/supplier-document.entity";
import {
  type SupplierDocumentQueryFilters,
  SupplierDocumentRepository,
} from "./supplier-document.repository";

@Injectable()
export class PostgresSupplierDocumentRepository
  extends TypeOrmCrudRepository<SupplierDocument>
  implements SupplierDocumentRepository
{
  constructor(@InjectRepository(SupplierDocument) repository: Repository<SupplierDocument>) {
    super(repository);
  }

  build(data: DeepPartial<SupplierDocument>): SupplierDocument {
    return this.repository.create(data as TypeOrmDeepPartial<SupplierDocument>);
  }

  findAllFilteredForCompany(
    companyId: number,
    filters: SupplierDocumentQueryFilters,
  ): Promise<SupplierDocument[]> {
    const qb = this.repository
      .createQueryBuilder("doc")
      .leftJoinAndSelect("doc.supplier", "supplier")
      .where("doc.companyId = :companyId", { companyId })
      .orderBy("doc.expiresAt", "ASC", "NULLS LAST")
      .addOrderBy("doc.createdAt", "DESC");

    if (filters.supplierId) {
      qb.andWhere("doc.supplierId = :supplierId", { supplierId: filters.supplierId });
    }

    if (filters.docType) {
      qb.andWhere("doc.docType = :docType", { docType: filters.docType });
    }

    return qb.getMany();
  }

  findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierDocument | null> {
    return this.repository.findOne({ where: { id, companyId }, relations });
  }

  async updateByIdForCompany(
    id: number,
    companyId: number,
    updates: DeepPartial<SupplierDocument>,
  ): Promise<void> {
    await this.repository.update(
      { id, companyId },
      updates as QueryDeepPartialEntity<SupplierDocument>,
    );
  }

  async deleteByIdForCompany(id: number, companyId: number): Promise<void> {
    await this.repository.delete({ id, companyId });
  }
}
