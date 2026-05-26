import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AcademicResult } from "../entities/academic-result.entity";
import { AcademicResultRepository } from "./academic-result.repository";

@Injectable()
export class PostgresAcademicResultRepository
  extends TypeOrmCrudRepository<AcademicResult>
  implements AcademicResultRepository
{
  constructor(@InjectRepository(AcademicResult) repository: Repository<AcademicResult>) {
    super(repository);
  }

  orderedForProfile(educationProfileId: string): Promise<AcademicResult[]> {
    return this.repository.find({
      where: { educationProfileId },
      order: { year: "DESC", subject: "ASC" },
    });
  }

  forProfile(educationProfileId: string): Promise<AcademicResult[]> {
    return this.repository.find({ where: { educationProfileId } });
  }

  async deleteByIdForProfile(resultId: string, educationProfileId: string): Promise<number> {
    const result = await this.repository.delete({ id: resultId, educationProfileId });
    return result.affected ?? 0;
  }
}
