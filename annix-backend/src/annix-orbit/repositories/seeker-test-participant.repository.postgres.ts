import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerTestParticipant } from "../entities/seeker-test-participant.entity";
import { SeekerTestParticipantRepository } from "./seeker-test-participant.repository";

@Injectable()
export class PostgresSeekerTestParticipantRepository
  extends TypeOrmCrudRepository<SeekerTestParticipant>
  implements SeekerTestParticipantRepository
{
  constructor(
    @InjectRepository(SeekerTestParticipant) repository: Repository<SeekerTestParticipant>,
  ) {
    super(repository);
  }

  findByCandidateAndPhase(
    candidateId: number,
    phaseId: string,
  ): Promise<SeekerTestParticipant | null> {
    return this.repository.findOne({ where: { candidateId, phaseId } });
  }

  listByPhase(phaseId: string): Promise<SeekerTestParticipant[]> {
    return this.repository.find({ where: { phaseId } });
  }

  countByPhase(phaseId: string): Promise<number> {
    return this.repository.count({ where: { phaseId } });
  }
}
