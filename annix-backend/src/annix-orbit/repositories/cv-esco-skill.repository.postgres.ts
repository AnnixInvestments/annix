import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CvEscoSkill } from "../entities/cv-esco-skill.entity";
import { CvEscoSkillRepository } from "./cv-esco-skill.repository";

@Injectable()
export class PostgresCvEscoSkillRepository
  extends TypeOrmCrudRepository<CvEscoSkill>
  implements CvEscoSkillRepository
{
  constructor(@InjectRepository(CvEscoSkill) repository: Repository<CvEscoSkill>) {
    super(repository);
  }
}
