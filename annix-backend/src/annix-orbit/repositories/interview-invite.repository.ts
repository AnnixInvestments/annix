import { CrudRepository } from "../../lib/persistence/crud-repository";
import { InterviewInvite } from "../entities/interview-invite.entity";

export abstract class InterviewInviteRepository extends CrudRepository<InterviewInvite> {
  abstract findByToken(token: string): Promise<InterviewInvite | null>;
  abstract findForCandidatesWithJob(candidateIds: number[]): Promise<InterviewInvite[]>;
}
