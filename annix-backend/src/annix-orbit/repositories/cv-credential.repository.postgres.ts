import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CvCredential } from "../entities/cv-credential.entity";
import { CvCredentialRepository } from "./cv-credential.repository";

@Injectable()
export class PostgresCvCredentialRepository
  extends TypeOrmCrudRepository<CvCredential>
  implements CvCredentialRepository
{
  constructor(@InjectRepository(CvCredential) repository: Repository<CvCredential>) {
    super(repository);
  }

  listForCandidates(candidateIds: number[]): Promise<CvCredential[]> {
    if (candidateIds.length === 0) return Promise.resolve([]);
    return this.repository
      .createQueryBuilder("c")
      .where("c.candidate_id IN (:...ids)", { ids: candidateIds })
      .orderBy("c.expires_at", "ASC", "NULLS LAST")
      .getMany();
  }

  findByCandidate(candidateId: number): Promise<CvCredential[]> {
    return this.repository.find({ where: { candidateId } });
  }

  validForCandidates(candidateIds: number[], today: string): Promise<CvCredential[]> {
    if (candidateIds.length === 0) return Promise.resolve([]);
    return this.repository
      .createQueryBuilder("c")
      .where("c.candidate_id IN (:...ids)", { ids: candidateIds })
      .andWhere("(c.expires_at IS NULL OR c.expires_at >= :today)", { today })
      .getMany();
  }

  expiringBetween(dayStart: string, dayEnd: string): Promise<CvCredential[]> {
    return this.repository.find({
      where: { expiresAt: Between(dayStart, dayEnd) },
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
