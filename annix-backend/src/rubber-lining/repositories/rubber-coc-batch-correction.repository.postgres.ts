import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberCocBatchCorrection } from "../entities/rubber-coc-batch-correction.entity";
import {
  type BatchCorrectionHintFilters,
  RubberCocBatchCorrectionRepository,
} from "./rubber-coc-batch-correction.repository";

@Injectable()
export class PostgresRubberCocBatchCorrectionRepository
  extends TypeOrmCrudRepository<RubberCocBatchCorrection>
  implements RubberCocBatchCorrectionRepository
{
  constructor(
    @InjectRepository(RubberCocBatchCorrection)
    repository: Repository<RubberCocBatchCorrection>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberCocBatchCorrection>): RubberCocBatchCorrection {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCocBatchCorrection>);
  }

  saveMany(entities: RubberCocBatchCorrection[]): Promise<RubberCocBatchCorrection[]> {
    return this.repository.save(entities);
  }

  findRecentForHints(filters: BatchCorrectionHintFilters): Promise<RubberCocBatchCorrection[]> {
    const query = this.repository.createQueryBuilder("c").orderBy("c.created_at", "DESC").take(30);

    if (filters.supplierName) {
      query.andWhere("c.supplier_name = :supplierName", { supplierName: filters.supplierName });
    }
    if (filters.compoundCode) {
      query.andWhere("c.compound_code = :compoundCode", { compoundCode: filters.compoundCode });
    }

    return query.getMany();
  }
}
