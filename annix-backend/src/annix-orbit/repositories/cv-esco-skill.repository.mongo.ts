import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CvEscoSkill } from "../entities/cv-esco-skill.entity";
import { CvEscoSkillRepository } from "./cv-esco-skill.repository";

@Injectable()
export class MongoCvEscoSkillRepository
  extends MongoCrudRepository<CvEscoSkill>
  implements CvEscoSkillRepository
{
  constructor(@InjectModel("CvEscoSkill") model: Model<CvEscoSkill>) {
    super(model);
  }
}
