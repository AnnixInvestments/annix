import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationProgramme } from "../entities/education-programme.entity";
import { EducationProgrammeRepository } from "./education-programme.repository";

@Injectable()
export class PostgresEducationProgrammeRepository
  extends TypeOrmCrudRepository<EducationProgramme>
  implements EducationProgrammeRepository
{
  constructor(@InjectRepository(EducationProgramme) repository: Repository<EducationProgramme>) {
    super(repository);
  }

  page(limit: number): Promise<EducationProgramme[]> {
    return this.repository.find({ take: limit });
  }

  findByIds(ids: string[]): Promise<EducationProgramme[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({ where: { id: In(ids) } });
  }

  listForInstitution(institutionId: string | null, limit: number): Promise<EducationProgramme[]> {
    const where = institutionId ? { institutionId } : {};
    return this.repository.find({ where, order: { name: "ASC" }, take: limit });
  }
}
