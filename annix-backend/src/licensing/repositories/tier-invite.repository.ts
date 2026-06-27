import { CrudRepository } from "../../lib/persistence/crud-repository";
import { TierInvite } from "../entities/tier-invite.entity";

export abstract class TierInviteRepository extends CrudRepository<TierInvite> {
  abstract findByModuleKey(moduleKey: string): Promise<TierInvite[]>;
  abstract findByToken(token: string): Promise<TierInvite | null>;
  abstract markAcceptedIfPending(id: number, acceptedAt: Date): Promise<boolean>;
}
