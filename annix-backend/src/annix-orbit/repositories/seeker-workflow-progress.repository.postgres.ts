import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerWorkflowProgress } from "../entities/seeker-workflow-progress.entity";
import { SeekerWorkflowProgressRepository } from "./seeker-workflow-progress.repository";

@Injectable()
export class PostgresSeekerWorkflowProgressRepository
  extends TypeOrmCrudRepository<SeekerWorkflowProgress>
  implements SeekerWorkflowProgressRepository
{
  constructor(
    @InjectRepository(SeekerWorkflowProgress) repository: Repository<SeekerWorkflowProgress>,
  ) {
    super(repository);
  }

  findByParticipant(participantId: string): Promise<SeekerWorkflowProgress | null> {
    return this.repository.findOne({ where: { participantId } });
  }

  listAll(): Promise<SeekerWorkflowProgress[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }
}
