import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationRecommendationSnapshot } from "../entities/education-recommendation-snapshot.entity";

export abstract class EducationRecommendationSnapshotRepository extends CrudRepository<EducationRecommendationSnapshot> {}
