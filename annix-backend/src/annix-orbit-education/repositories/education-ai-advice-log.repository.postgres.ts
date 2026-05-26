import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationAiAdviceLog } from "../entities/education-ai-advice-log.entity";
import { EducationAiAdviceLogRepository } from "./education-ai-advice-log.repository";

@Injectable()
export class PostgresEducationAiAdviceLogRepository
  extends TypeOrmCrudRepository<EducationAiAdviceLog>
  implements EducationAiAdviceLogRepository
{
  constructor(
    @InjectRepository(EducationAiAdviceLog) repository: Repository<EducationAiAdviceLog>,
  ) {
    super(repository);
  }
}
