import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitTeamInvite } from "../entities/annix-orbit-team-invite.entity";

export abstract class AnnixOrbitTeamInviteRepository extends CrudRepository<AnnixOrbitTeamInvite> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitTeamInvite[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTeamInvite | null>;
  abstract findByToken(token: string): Promise<AnnixOrbitTeamInvite | null>;
}
