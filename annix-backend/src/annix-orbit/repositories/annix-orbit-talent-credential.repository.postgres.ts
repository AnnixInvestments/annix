import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitTalentCredential } from "../entities/annix-orbit-talent-credential.entity";
import { AnnixOrbitTalentCredentialRepository } from "./annix-orbit-talent-credential.repository";

@Injectable()
export class PostgresAnnixOrbitTalentCredentialRepository
  extends TypeOrmCrudRepository<AnnixOrbitTalentCredential>
  implements AnnixOrbitTalentCredentialRepository
{
  constructor(
    @InjectRepository(AnnixOrbitTalentCredential)
    repository: Repository<AnnixOrbitTalentCredential>,
  ) {
    super(repository);
  }

  findByCandidate(candidateId: number): Promise<AnnixOrbitTalentCredential[]> {
    return this.repository
      .createQueryBuilder("c")
      .where("c.candidate_id = :candidateId", { candidateId })
      .orderBy("c.expires_at", "ASC", "NULLS LAST")
      .getMany();
  }

  listForCandidates(candidateIds: number[]): Promise<AnnixOrbitTalentCredential[]> {
    if (candidateIds.length === 0) return Promise.resolve([]);
    return this.repository
      .createQueryBuilder("c")
      .where("c.candidate_id IN (:...ids)", { ids: candidateIds })
      .orderBy("c.expires_at", "ASC", "NULLS LAST")
      .getMany();
  }

  expiringForCompany(
    companyId: number,
    dayStart: string,
    dayEnd: string,
  ): Promise<AnnixOrbitTalentCredential[]> {
    return this.repository.find({
      where: { companyId, expiresAt: Between(dayStart, dayEnd) },
      order: { expiresAt: "ASC" },
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
