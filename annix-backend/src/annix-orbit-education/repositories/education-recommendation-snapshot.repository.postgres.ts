import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationRecommendationSnapshot } from "../entities/education-recommendation-snapshot.entity";
import { EducationRecommendationSnapshotRepository } from "./education-recommendation-snapshot.repository";

@Injectable()
export class PostgresEducationRecommendationSnapshotRepository
  extends TypeOrmCrudRepository<EducationRecommendationSnapshot>
  implements EducationRecommendationSnapshotRepository
{
  constructor(
    @InjectRepository(EducationRecommendationSnapshot)
    repository: Repository<EducationRecommendationSnapshot>,
  ) {
    super(repository);
  }
}
