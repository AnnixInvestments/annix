import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitTalentPool } from "../entities/annix-orbit-talent-pool.entity";
import { AnnixOrbitTalentPoolRepository } from "./annix-orbit-talent-pool.repository";

@Injectable()
export class PostgresAnnixOrbitTalentPoolRepository
  extends TypeOrmCrudRepository<AnnixOrbitTalentPool>
  implements AnnixOrbitTalentPoolRepository
{
  constructor(
    @InjectRepository(AnnixOrbitTalentPool) repository: Repository<AnnixOrbitTalentPool>,
  ) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitTalentPool[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTalentPool | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
