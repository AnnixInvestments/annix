import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { EducationAiAdviceLog } from "../entities/education-ai-advice-log.entity";
import { EducationAiAdviceLogRepository } from "./education-ai-advice-log.repository";

@Injectable()
export class MongoEducationAiAdviceLogRepository
  extends MongoCrudRepository<EducationAiAdviceLog>
  implements EducationAiAdviceLogRepository
{
  constructor(
    @InjectModel("EducationAiAdviceLog", ORBIT_CONNECTION) model: Model<EducationAiAdviceLog>,
  ) {
    super(model);
  }
}
