import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerTestPhase } from "../entities/seeker-test-phase.entity";
import { SeekerTestPhaseRepository } from "./seeker-test-phase.repository";

@Injectable()
export class PostgresSeekerTestPhaseRepository
  extends TypeOrmCrudRepository<SeekerTestPhase>
  implements SeekerTestPhaseRepository
{
  constructor(@InjectRepository(SeekerTestPhase) repository: Repository<SeekerTestPhase>) {
    super(repository);
  }

  listNewestFirst(): Promise<SeekerTestPhase[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }

  findByStatus(status: string): Promise<SeekerTestPhase[]> {
    return this.repository.find({ where: { status } });
  }
}
