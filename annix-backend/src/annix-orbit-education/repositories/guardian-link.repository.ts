import { CrudRepository } from "../../lib/persistence/crud-repository";
import { GuardianLink } from "../entities/guardian-link.entity";

export abstract class GuardianLinkRepository extends CrudRepository<GuardianLink> {
  abstract orderedForProfile(educationProfileId: string): Promise<GuardianLink[]>;
  abstract findByProfileAndEmail(
    educationProfileId: string,
    guardianEmail: string,
  ): Promise<GuardianLink | null>;
  abstract allOrderedByInvitedAt(): Promise<GuardianLink[]>;
}
