import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerWorkflowStep } from "../entities/seeker-workflow-step.entity";
import { SeekerWorkflowStepRepository } from "./seeker-workflow-step.repository";

@Injectable()
export class PostgresSeekerWorkflowStepRepository
  extends TypeOrmCrudRepository<SeekerWorkflowStep>
  implements SeekerWorkflowStepRepository
{
  constructor(@InjectRepository(SeekerWorkflowStep) repository: Repository<SeekerWorkflowStep>) {
    super(repository);
  }

  findByParticipantAndStep(
    participantId: string,
    stepKey: string,
  ): Promise<SeekerWorkflowStep | null> {
    return this.repository.findOne({ where: { participantId, stepKey } });
  }

  listByParticipant(participantId: string): Promise<SeekerWorkflowStep[]> {
    return this.repository.find({ where: { participantId }, order: { createdAt: "DESC" } });
  }
}
