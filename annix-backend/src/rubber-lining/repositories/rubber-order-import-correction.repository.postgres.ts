import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberOrderImportCorrection } from "../entities/rubber-order-import-correction.entity";
import { RubberOrderImportCorrectionRepository } from "./rubber-order-import-correction.repository";

@Injectable()
export class PostgresRubberOrderImportCorrectionRepository
  extends TypeOrmCrudRepository<RubberOrderImportCorrection>
  implements RubberOrderImportCorrectionRepository
{
  constructor(
    @InjectRepository(RubberOrderImportCorrection)
    repository: Repository<RubberOrderImportCorrection>,
  ) {
    super(repository);
  }

  saveMany(rows: Partial<RubberOrderImportCorrection>[]): Promise<RubberOrderImportCorrection[]> {
    return this.repository.save(rows as TypeOrmDeepPartial<RubberOrderImportCorrection>[]);
  }

  findOneByFieldAndOriginalValueLatest(
    fieldName: string,
    originalValue: string,
  ): Promise<RubberOrderImportCorrection | null> {
    return this.repository.findOne({
      where: { fieldName, originalValue },
      order: { createdAt: "DESC" },
    });
  }

  findByCompanyNameLatest(
    companyName: string,
    take: number,
  ): Promise<RubberOrderImportCorrection[]> {
    return this.repository.find({
      where: { companyName },
      order: { createdAt: "DESC" },
      take,
    });
  }
}
