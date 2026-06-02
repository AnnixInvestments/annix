import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitSubmission } from "../entities/annix-orbit-submission.entity";
import { AnnixOrbitSubmissionRepository } from "./annix-orbit-submission.repository";

@Injectable()
export class PostgresAnnixOrbitSubmissionRepository
  extends TypeOrmCrudRepository<AnnixOrbitSubmission>
  implements AnnixOrbitSubmissionRepository
{
  constructor(
    @InjectRepository(AnnixOrbitSubmission) repository: Repository<AnnixOrbitSubmission>,
  ) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitSubmission[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitSubmission | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
