import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationApplication } from "../entities/education-application.entity";
import { EducationApplicationRepository } from "./education-application.repository";

@Injectable()
export class PostgresEducationApplicationRepository
  extends TypeOrmCrudRepository<EducationApplication>
  implements EducationApplicationRepository
{
  constructor(
    @InjectRepository(EducationApplication) repository: Repository<EducationApplication>,
  ) {
    super(repository);
  }

  orderedForProfile(educationProfileId: string): Promise<EducationApplication[]> {
    return this.repository.find({
      where: { educationProfileId },
      order: { createdAt: "DESC" },
    });
  }

  findByIdForProfile(
    applicationId: string,
    educationProfileId: string,
  ): Promise<EducationApplication | null> {
    return this.repository.findOne({ where: { id: applicationId, educationProfileId } });
  }

  async deleteByIdForProfile(applicationId: string, educationProfileId: string): Promise<number> {
    const result = await this.repository.delete({ id: applicationId, educationProfileId });
    return result.affected ?? 0;
  }

  countForProfile(educationProfileId: string): Promise<number> {
    return this.repository.count({ where: { educationProfileId } });
  }
}
