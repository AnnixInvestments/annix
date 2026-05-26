import { CrudRepository } from "../../lib/persistence/crud-repository";
import { EducationAiAdviceLog } from "../entities/education-ai-advice-log.entity";

export abstract class EducationAiAdviceLogRepository extends CrudRepository<EducationAiAdviceLog> {}
