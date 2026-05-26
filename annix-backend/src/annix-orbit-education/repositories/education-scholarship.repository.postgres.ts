import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationScholarship } from "../entities/education-scholarship.entity";
import { EducationScholarshipRepository } from "./education-scholarship.repository";

@Injectable()
export class PostgresEducationScholarshipRepository
  extends TypeOrmCrudRepository<EducationScholarship>
  implements EducationScholarshipRepository
{
  constructor(
    @InjectRepository(EducationScholarship) repository: Repository<EducationScholarship>,
  ) {
    super(repository);
  }

  activeOrderedByName(limit: number): Promise<EducationScholarship[]> {
    return this.repository.find({
      where: { active: true },
      order: { name: "ASC" },
      take: limit,
    });
  }

  allOrderedByName(): Promise<EducationScholarship[]> {
    return this.repository.find({ order: { name: "ASC" } });
  }
}
