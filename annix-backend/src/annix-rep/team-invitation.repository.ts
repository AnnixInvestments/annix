import { CrudRepository } from "../lib/persistence/crud-repository";
import { TeamInvitation } from "./entities/team-invitation.entity";

export abstract class TeamInvitationRepository extends CrudRepository<TeamInvitation> {
  abstract findPendingByOrganization(organizationId: number): Promise<TeamInvitation[]>;
  abstract findByToken(token: string): Promise<TeamInvitation | null>;
  abstract findByIdWithRelations(id: number): Promise<TeamInvitation | null>;
  abstract findPendingByOrganizationAndEmail(
    organizationId: number,
    email: string,
  ): Promise<TeamInvitation | null>;
  abstract expireOldPending(asOf: Date): Promise<number>;
}
