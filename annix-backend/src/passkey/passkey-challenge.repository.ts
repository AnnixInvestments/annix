import { CrudRepository } from "../lib/persistence/crud-repository";
import type { PasskeyChallengeType } from "./entities/passkey-challenge.entity";
import { PasskeyChallenge } from "./entities/passkey-challenge.entity";

export abstract class PasskeyChallengeRepository extends CrudRepository<PasskeyChallenge> {
  abstract findLatestForUserAndType(
    userId: number | null,
    type: PasskeyChallengeType,
  ): Promise<PasskeyChallenge | null>;
  abstract findLatestForAuthenticationByUserId(userId: number): Promise<PasskeyChallenge | null>;
  abstract deleteById(id: number): Promise<void>;
  abstract deleteExpiredBefore(cutoff: Date): Promise<number>;
}
