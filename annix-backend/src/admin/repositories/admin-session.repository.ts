import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AdminSession } from "../entities/admin-session.entity";

export abstract class AdminSessionRepository extends CrudRepository<AdminSession> {
  abstract findActiveByUserAndToken(
    userId: number,
    sessionToken: string,
  ): Promise<AdminSession | null>;
  abstract findActiveByTokenWithUser(sessionToken: string, now: Date): Promise<AdminSession | null>;
  abstract countActive(now: Date, recentActivityThreshold: Date): Promise<number>;
  abstract findLatestByUser(userId: number): Promise<AdminSession | null>;
  abstract findRecentByUser(userId: number, limit: number): Promise<AdminSession[]>;
  abstract revokeAllForUser(userId: number, revokedAt: Date): Promise<void>;
}
