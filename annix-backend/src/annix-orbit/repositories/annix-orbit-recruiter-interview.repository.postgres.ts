import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitRecruiterInterview } from "../entities/annix-orbit-recruiter-interview.entity";
import { AnnixOrbitRecruiterInterviewRepository } from "./annix-orbit-recruiter-interview.repository";

@Injectable()
export class PostgresAnnixOrbitRecruiterInterviewRepository
  extends TypeOrmCrudRepository<AnnixOrbitRecruiterInterview>
  implements AnnixOrbitRecruiterInterviewRepository
{
  constructor(
    @InjectRepository(AnnixOrbitRecruiterInterview)
    repository: Repository<AnnixOrbitRecruiterInterview>,
  ) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitRecruiterInterview[]> {
    return this.repository.find({ where: { companyId }, order: { scheduledAt: "ASC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitRecruiterInterview | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
