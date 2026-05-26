import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberCuttingTraining } from "../entities/rubber-cutting-training.entity";
import { RubberCuttingTrainingRepository } from "./rubber-cutting-training.repository";

@Injectable()
export class PostgresRubberCuttingTrainingRepository
  extends TypeOrmCrudRepository<RubberCuttingTraining>
  implements RubberCuttingTrainingRepository
{
  constructor(
    @InjectRepository(RubberCuttingTraining)
    repository: Repository<RubberCuttingTraining>,
  ) {
    super(repository);
  }

  findOneForCompanyByFingerprint(
    companyId: number,
    panelFingerprint: string,
  ): Promise<RubberCuttingTraining | null> {
    return this.repository.findOne({
      where: {
        companyId,
        panelFingerprint,
      },
    });
  }

  findOneForCompanyById(companyId: number, id: number): Promise<RubberCuttingTraining | null> {
    return this.repository.findOne({
      where: { id, companyId },
    });
  }

  findById(id: number): Promise<RubberCuttingTraining | null> {
    return this.repository.findOneBy({ id });
  }

  async updateById(id: number, changes: DeepPartial<RubberCuttingTraining>): Promise<void> {
    await this.repository.update(id, changes as QueryDeepPartialEntity<RubberCuttingTraining>);
  }

  findExactMatches(companyId: number, panelFingerprint: string): Promise<RubberCuttingTraining[]> {
    return this.repository
      .createQueryBuilder("t")
      .where("t.company_id = :companyId", { companyId })
      .andWhere("t.panel_fingerprint = :fingerprint", { fingerprint: panelFingerprint })
      .orderBy("t.feedback_score", "DESC")
      .addOrderBy("t.usage_count", "DESC")
      .limit(3)
      .getMany();
  }

  findSimilarByPanelCount(
    companyId: number,
    minCount: number,
    maxCount: number,
  ): Promise<RubberCuttingTraining[]> {
    return this.repository
      .createQueryBuilder("t")
      .where("t.company_id = :companyId", { companyId })
      .andWhere("t.panel_count BETWEEN :minCount AND :maxCount", { minCount, maxCount })
      .orderBy("t.feedback_score", "DESC")
      .addOrderBy("t.usage_count", "DESC")
      .limit(5)
      .getMany();
  }

  async incrementTimesSuggested(ids: number[]): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ timesSuggested: () => "times_suggested + 1" })
      .whereInIds(ids)
      .execute();
  }
}
