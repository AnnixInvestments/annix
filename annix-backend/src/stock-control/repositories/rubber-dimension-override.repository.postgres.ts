import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberDimensionOverride } from "../entities/rubber-dimension-override.entity";
import {
  type RubberDimensionOverrideMatch,
  type RubberDimensionOverrideQuery,
  RubberDimensionOverrideRepository,
} from "./rubber-dimension-override.repository";

@Injectable()
export class PostgresRubberDimensionOverrideRepository
  extends TypeOrmCrudRepository<RubberDimensionOverride>
  implements RubberDimensionOverrideRepository
{
  constructor(
    @InjectRepository(RubberDimensionOverride)
    repository: Repository<RubberDimensionOverride>,
  ) {
    super(repository);
  }

  findMatchingOverride(
    companyId: number,
    criteria: RubberDimensionOverrideMatch,
  ): Promise<RubberDimensionOverride | null> {
    return this.repository
      .createQueryBuilder("o")
      .where("o.company_id = :companyId", { companyId })
      .andWhere("COALESCE(o.item_type, '') = COALESCE(:itemType, '')", {
        itemType: criteria.itemType,
      })
      .andWhere("COALESCE(o.nb_mm, 0) = COALESCE(:nbMm, 0)", {
        nbMm: criteria.nbMm,
      })
      .andWhere("COALESCE(o.od_mm, 0) = COALESCE(:odMm, 0)", {
        odMm: criteria.odMm,
      })
      .andWhere("COALESCE(o.schedule, '') = COALESCE(:schedule, '')", {
        schedule: criteria.schedule,
      })
      .andWhere("o.pipe_length_mm = :pipeLengthMm", {
        pipeLengthMm: criteria.pipeLengthMm,
      })
      .andWhere("COALESCE(o.flange_config, '') = COALESCE(:flangeConfig, '')", {
        flangeConfig: criteria.flangeConfig,
      })
      .getOne();
  }

  findBestSuggestions(
    companyId: number,
    criteria: RubberDimensionOverrideQuery,
  ): Promise<RubberDimensionOverride[]> {
    return this.repository
      .createQueryBuilder("o")
      .where("o.company_id = :companyId", { companyId })
      .andWhere("COALESCE(o.item_type, '') = COALESCE(:itemType, '')", {
        itemType: criteria.itemType,
      })
      .andWhere("COALESCE(o.nb_mm, 0) = COALESCE(:nbMm, 0)", {
        nbMm: criteria.nbMm,
      })
      .andWhere("COALESCE(o.schedule, '') = COALESCE(:schedule, '')", {
        schedule: criteria.schedule,
      })
      .andWhere("o.pipe_length_mm = :pipeLengthMm", {
        pipeLengthMm: criteria.pipeLengthMm,
      })
      .andWhere("COALESCE(o.flange_config, '') = COALESCE(:flangeConfig, '')", {
        flangeConfig: criteria.flangeConfig,
      })
      .orderBy("o.usage_count", "DESC")
      .limit(1)
      .getMany();
  }

  async updateById(id: number, changes: DeepPartial<RubberDimensionOverride>): Promise<void> {
    await this.repository.update(id, changes as QueryDeepPartialEntity<RubberDimensionOverride>);
  }
}
