import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitEeDisclosureInvite } from "../entities/annix-orbit-ee-disclosure-invite.entity";

export abstract class AnnixOrbitEeDisclosureInviteRepository extends CrudRepository<AnnixOrbitEeDisclosureInvite> {
  abstract findActiveInvite(
    candidateId: number,
    jobPostingId: number,
    now: Date,
  ): Promise<AnnixOrbitEeDisclosureInvite | null>;
  abstract findByToken(token: string): Promise<AnnixOrbitEeDisclosureInvite | null>;
  abstract findByTokenWithRelations(token: string): Promise<AnnixOrbitEeDisclosureInvite | null>;
  abstract markUsed(id: number, usedAt: Date): Promise<void>;
}
