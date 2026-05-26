import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerMute } from "../entities/seeker-mute.entity";
import { SeekerMuteRepository } from "./seeker-mute.repository";

@Injectable()
export class PostgresSeekerMuteRepository
  extends TypeOrmCrudRepository<SeekerMute>
  implements SeekerMuteRepository
{
  constructor(@InjectRepository(SeekerMute) repository: Repository<SeekerMute>) {
    super(repository);
  }

  findByCandidateAndCompany(candidateId: number, company: string): Promise<SeekerMute | null> {
    return this.repository
      .createQueryBuilder("mute")
      .where("mute.candidate_id = :candidateId", { candidateId })
      .andWhere("LOWER(mute.company_name) = LOWER(:company)", { company })
      .getOne();
  }

  findByCandidateAndCategory(candidateId: number, category: string): Promise<SeekerMute | null> {
    return this.repository
      .createQueryBuilder("mute")
      .where("mute.candidate_id = :candidateId", { candidateId })
      .andWhere("LOWER(mute.category) = LOWER(:category)", { category })
      .getOne();
  }

  listForCandidates(candidateIds: number[]): Promise<SeekerMute[]> {
    if (candidateIds.length === 0) return Promise.resolve([]);
    return this.repository
      .createQueryBuilder("mute")
      .where("mute.candidate_id IN (:...ids)", { ids: candidateIds })
      .orderBy("mute.muted_at", "DESC")
      .getMany();
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
