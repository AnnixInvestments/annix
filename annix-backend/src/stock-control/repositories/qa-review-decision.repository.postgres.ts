import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { QaReviewDecision } from "../entities/qa-review-decision.entity";
import { QaReviewDecisionRepository } from "./qa-review-decision.repository";

@Injectable()
export class PostgresQaReviewDecisionRepository
  extends TypeOrmCrudRepository<QaReviewDecision>
  implements QaReviewDecisionRepository
{
  constructor(@InjectRepository(QaReviewDecision) repository: Repository<QaReviewDecision>) {
    super(repository);
  }

  findLatestForJobCard(companyId: number, jobCardId: number): Promise<QaReviewDecision | null> {
    return this.repository.findOne({
      where: { companyId, jobCardId },
      order: { cycleNumber: "DESC" },
    });
  }
}
