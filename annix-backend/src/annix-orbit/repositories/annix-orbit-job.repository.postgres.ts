import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitJob } from "../entities/annix-orbit-job.entity";
import { AnnixOrbitJobRepository } from "./annix-orbit-job.repository";

@Injectable()
export class PostgresAnnixOrbitJobRepository
  extends TypeOrmCrudRepository<AnnixOrbitJob>
  implements AnnixOrbitJobRepository
{
  constructor(@InjectRepository(AnnixOrbitJob) repository: Repository<AnnixOrbitJob>) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitJob[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitJob | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
