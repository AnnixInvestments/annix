import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { InterviewInvite } from "../entities/interview-invite.entity";
import { InterviewInviteRepository } from "./interview-invite.repository";

@Injectable()
export class PostgresInterviewInviteRepository
  extends TypeOrmCrudRepository<InterviewInvite>
  implements InterviewInviteRepository
{
  constructor(@InjectRepository(InterviewInvite) repository: Repository<InterviewInvite>) {
    super(repository);
  }

  findByToken(token: string): Promise<InterviewInvite | null> {
    return this.repository.findOne({ where: { token } });
  }

  findForCandidatesWithJob(candidateIds: number[]): Promise<InterviewInvite[]> {
    if (candidateIds.length === 0) return Promise.resolve([]);
    return this.repository.find({
      where: { candidateId: In(candidateIds) },
      relations: ["jobPosting"],
      order: { createdAt: "DESC" },
    });
  }
}
