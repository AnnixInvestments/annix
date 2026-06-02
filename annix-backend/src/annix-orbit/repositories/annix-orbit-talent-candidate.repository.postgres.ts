import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitTalentCandidate } from "../entities/annix-orbit-talent-candidate.entity";
import { AnnixOrbitTalentCandidateRepository } from "./annix-orbit-talent-candidate.repository";

@Injectable()
export class PostgresAnnixOrbitTalentCandidateRepository
  extends TypeOrmCrudRepository<AnnixOrbitTalentCandidate>
  implements AnnixOrbitTalentCandidateRepository
{
  constructor(
    @InjectRepository(AnnixOrbitTalentCandidate) repository: Repository<AnnixOrbitTalentCandidate>,
  ) {
    super(repository);
  }

  findVisibleForCompany(companyId: number, userId: number): Promise<AnnixOrbitTalentCandidate[]> {
    return this.repository
      .createQueryBuilder("candidate")
      .where("candidate.companyId = :companyId", { companyId })
      .andWhere("(candidate.visibility != :private OR candidate.ownerUserId = :userId)", {
        private: "private",
        userId,
      })
      .orderBy("candidate.createdAt", "DESC")
      .getMany();
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTalentCandidate | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
