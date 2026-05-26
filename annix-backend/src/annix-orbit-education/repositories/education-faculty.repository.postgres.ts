import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationFaculty } from "../entities/education-faculty.entity";
import { EducationFacultyRepository } from "./education-faculty.repository";

@Injectable()
export class PostgresEducationFacultyRepository
  extends TypeOrmCrudRepository<EducationFaculty>
  implements EducationFacultyRepository
{
  constructor(@InjectRepository(EducationFaculty) repository: Repository<EducationFaculty>) {
    super(repository);
  }

  forInstitutionOrderedByName(institutionId: string): Promise<EducationFaculty[]> {
    return this.repository.find({ where: { institutionId }, order: { name: "ASC" } });
  }
}
