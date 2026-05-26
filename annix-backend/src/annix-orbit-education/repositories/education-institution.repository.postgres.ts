import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationInstitution } from "../entities/education-institution.entity";
import { EducationInstitutionRepository } from "./education-institution.repository";

@Injectable()
export class PostgresEducationInstitutionRepository
  extends TypeOrmCrudRepository<EducationInstitution>
  implements EducationInstitutionRepository
{
  constructor(
    @InjectRepository(EducationInstitution) repository: Repository<EducationInstitution>,
  ) {
    super(repository);
  }

  allOrderedByName(): Promise<EducationInstitution[]> {
    return this.repository.find({ order: { name: "ASC" } });
  }
}
