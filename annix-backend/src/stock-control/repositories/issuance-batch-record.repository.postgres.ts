import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";
import { IssuanceBatchRecordRepository } from "./issuance-batch-record.repository";

@Injectable()
export class PostgresIssuanceBatchRecordRepository
  extends TypeOrmCrudRepository<IssuanceBatchRecord>
  implements IssuanceBatchRecordRepository
{
  constructor(
    @InjectRepository(IssuanceBatchRecord)
    repository: Repository<IssuanceBatchRecord>,
  ) {
    super(repository);
  }

  findForJobCardWithCertificate(
    companyId: number,
    jobCardId: number,
  ): Promise<IssuanceBatchRecord[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      relations: [
        "supplierCertificate",
        "supplierCertificate.supplier",
        "supplierCertificate.stockItem",
      ],
    });
  }

  findForJobCardWithDetails(companyId: number, jobCardId: number): Promise<IssuanceBatchRecord[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      relations: ["stockItem", "supplierCertificate", "supplierCertificate.supplier"],
      order: { createdAt: "DESC" },
    });
  }

  findByBatchNumberWithDetails(
    companyId: number,
    batchNumber: string,
  ): Promise<IssuanceBatchRecord[]> {
    return this.repository.find({
      where: { companyId, batchNumber: batchNumber.trim() },
      relations: ["stockItem", "supplierCertificate", "supplierCertificate.supplier"],
      order: { createdAt: "DESC" },
    });
  }

  certificateCountsByJobCard(
    companyId: number,
    jobCardIds: number[],
  ): Promise<Array<{ jobCardId: number; certCount: string }>> {
    return this.repository
      .createQueryBuilder("br")
      .select("br.job_card_id", "jobCardId")
      .addSelect("COUNT(DISTINCT br.supplier_certificate_id)", "certCount")
      .where("br.company_id = :companyId", { companyId })
      .andWhere("br.job_card_id IN (:...jobCardIds)", { jobCardIds })
      .andWhere("br.supplier_certificate_id IS NOT NULL")
      .groupBy("br.job_card_id")
      .getRawMany<{ jobCardId: number; certCount: string }>();
  }

  async recentBatchNumbers(
    companyId: number,
    stockItemId: number,
    limit: number,
  ): Promise<string[]> {
    const records = await this.repository
      .createQueryBuilder("br")
      .select("DISTINCT br.batch_number", "batchNumber")
      .where("br.company_id = :companyId", { companyId })
      .andWhere("br.stock_item_id = :stockItemId", { stockItemId })
      .orderBy("br.batch_number", "ASC")
      .limit(limit)
      .getRawMany<{ batchNumber: string }>();
    return records.map((r) => r.batchNumber);
  }

  findUnlinkedToCertificate(companyId: number): Promise<IssuanceBatchRecord[]> {
    return this.repository.find({
      where: { companyId, supplierCertificateId: IsNull() },
    });
  }

  async updateById(id: number, changes: DeepPartial<IssuanceBatchRecord>): Promise<void> {
    await this.repository.update(id, changes as QueryDeepPartialEntity<IssuanceBatchRecord>);
  }
}
