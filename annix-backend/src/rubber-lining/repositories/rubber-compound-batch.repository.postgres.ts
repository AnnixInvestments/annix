import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import { RubberCompoundBatch } from "../entities/rubber-compound-batch.entity";
import { SupplierCocType } from "../entities/rubber-supplier-coc.entity";
import { RubberCompoundBatchRepository } from "./rubber-compound-batch.repository";

@Injectable()
export class PostgresRubberCompoundBatchRepository
  extends TypeOrmCrudRepository<RubberCompoundBatch>
  implements RubberCompoundBatchRepository
{
  constructor(@InjectRepository(RubberCompoundBatch) repository: Repository<RubberCompoundBatch>) {
    super(repository);
  }

  build(data: Partial<RubberCompoundBatch>): RubberCompoundBatch {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCompoundBatch>);
  }

  saveMany(entities: RubberCompoundBatch[]): Promise<RubberCompoundBatch[]> {
    return this.repository.save(entities);
  }

  findByIdsWithSupplierCocOrdered(ids: number[]): Promise<RubberCompoundBatch[]> {
    return this.repository.find({
      where: { id: In(ids) },
      relations: ["supplierCoc"],
      order: { batchNumber: "ASC" },
    });
  }

  findByIdsWithRelations(ids: number[], relations: string[]): Promise<RubberCompoundBatch[]> {
    return this.repository.find({
      where: { id: In(ids) },
      relations,
    });
  }

  countBySupplierCocId(supplierCocId: number): Promise<number> {
    return this.repository.count({
      where: { supplierCocId },
    });
  }

  findBySupplierCocIdOrdered(supplierCocId: number): Promise<RubberCompoundBatch[]> {
    return this.repository.find({
      where: { supplierCocId },
      order: { batchNumber: "ASC" },
    });
  }

  async deleteBySupplierCocId(supplierCocId: number): Promise<void> {
    await this.repository.delete({ supplierCocId });
  }

  async deleteAllWithSupplierCoc(): Promise<number> {
    const batchResult = await this.repository
      .createQueryBuilder()
      .delete()
      .where("supplier_coc_id IS NOT NULL")
      .execute();
    return batchResult.affected || 0;
  }

  findOneByIdWithRelations(id: number, relations: string[]): Promise<RubberCompoundBatch | null> {
    return this.repository.findOne({
      where: { id },
      relations,
    });
  }

  completeBatchesForCompound(compoundCode: string): Promise<RubberCompoundBatch[]> {
    return this.repository
      .createQueryBuilder("batch")
      .innerJoin("batch.supplierCoc", "coc")
      .where("coc.compound_code = :compoundCode", { compoundCode })
      .andWhere("coc.coc_type = :type", { type: SupplierCocType.COMPOUNDER })
      .andWhere("batch.shore_a_hardness IS NOT NULL")
      .andWhere("batch.specific_gravity IS NOT NULL")
      .andWhere("batch.tensile_strength_mpa IS NOT NULL")
      .andWhere("batch.elongation_percent IS NOT NULL")
      .andWhere("batch.tear_strength_kn_m IS NOT NULL")
      .andWhere("batch.rheometer_tc90 IS NOT NULL")
      .orderBy("batch.created_at", "DESC")
      .getMany();
  }

  findBySupplierCocIdWithRelationsOrdered(supplierCocId: number): Promise<RubberCompoundBatch[]> {
    return this.repository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.supplierCoc", "supplierCoc")
      .leftJoinAndSelect("batch.compoundStock", "compoundStock")
      .leftJoinAndSelect("compoundStock.compoundCoding", "compoundCoding")
      .where("batch.supplier_coc_id = :supplierCocId", { supplierCocId })
      .orderBy(
        "CASE WHEN batch.batch_number ~ '^[0-9]+$' THEN CAST(batch.batch_number AS INTEGER) ELSE 0 END",
        "ASC",
      )
      .addOrderBy("batch.batchNumber", "ASC")
      .getMany();
  }

  findByBatchNumbersForActiveCocOrdered(
    batchNumbers: string[],
    equivalentCompoundCodes: string[],
  ): Promise<RubberCompoundBatch[]> {
    const qb = this.repository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.supplierCoc", "supplierCoc")
      .leftJoinAndSelect("batch.compoundStock", "compoundStock")
      .leftJoinAndSelect("compoundStock.compoundCoding", "compoundCoding")
      .where("batch.batchNumber IN (:...batchNumbers)", { batchNumbers })
      .andWhere("supplierCoc.version_status = :activeVersionStatus", {
        activeVersionStatus: DocumentVersionStatus.ACTIVE,
      });

    if (equivalentCompoundCodes.length > 0) {
      qb.andWhere("supplierCoc.compoundCode IN (:...equivalentCompoundCodes)", {
        equivalentCompoundCodes,
      });
    }

    qb.orderBy(
      "CASE WHEN batch.batch_number ~ '^[0-9]+$' THEN CAST(batch.batch_number AS INTEGER) ELSE 0 END",
      "ASC",
    ).addOrderBy("batch.batchNumber", "ASC");

    return qb.getMany();
  }

  findByBatchNumbersWithStockForActiveCoc(batchNumbers: string[]): Promise<RubberCompoundBatch[]> {
    return this.repository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.compoundStock", "stock")
      .leftJoinAndSelect("stock.compoundCoding", "coding")
      .leftJoin("batch.supplierCoc", "supplierCoc")
      .where("batch.batch_number IN (:...batchNumbers)", { batchNumbers })
      .andWhere("supplierCoc.version_status = :activeVersionStatus", {
        activeVersionStatus: DocumentVersionStatus.ACTIVE,
      })
      .getMany();
  }
}
