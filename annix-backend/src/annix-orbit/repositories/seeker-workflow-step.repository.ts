import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerWorkflowStep } from "../entities/seeker-workflow-step.entity";

export abstract class SeekerWorkflowStepRepository extends CrudRepository<SeekerWorkflowStep> {
  abstract findByParticipantAndStep(
    participantId: string,
    stepKey: string,
  ): Promise<SeekerWorkflowStep | null>;
  abstract listByParticipant(participantId: string): Promise<SeekerWorkflowStep[]>;
}
