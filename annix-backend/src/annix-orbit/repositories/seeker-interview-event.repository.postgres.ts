import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerInterviewEvent } from "../entities/seeker-interview-event.entity";
import { SeekerInterviewEventRepository } from "./seeker-interview-event.repository";

@Injectable()
export class PostgresSeekerInterviewEventRepository
  extends TypeOrmCrudRepository<SeekerInterviewEvent>
  implements SeekerInterviewEventRepository
{
  constructor(
    @InjectRepository(SeekerInterviewEvent) repository: Repository<SeekerInterviewEvent>,
  ) {
    super(repository);
  }

  listForCandidates(candidateIds: number[]): Promise<SeekerInterviewEvent[]> {
    if (candidateIds.length === 0) return Promise.resolve([]);
    return this.repository.find({
      where: { candidateId: In(candidateIds) },
      order: { startsAt: "ASC" },
    });
  }

  startingBetween(from: Date, to: Date): Promise<SeekerInterviewEvent[]> {
    return this.repository.find({
      where: { startsAt: Between(from, to) },
      order: { startsAt: "ASC" },
    });
  }
}
