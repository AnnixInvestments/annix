import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CvEscoSkill } from "../entities/cv-esco-skill.entity";

export abstract class CvEscoSkillRepository extends CrudRepository<CvEscoSkill> {}
