import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixRepSession } from "./entities/annix-rep-session.entity";

export abstract class AnnixRepSessionRepository extends CrudRepository<AnnixRepSession> {
  abstract findActiveByToken(sessionToken: string): Promise<AnnixRepSession | null>;
  abstract findActiveByTokenWithUser(sessionToken: string): Promise<AnnixRepSession | null>;
  abstract updateActiveUserSessions(
    userId: number,
    updates: Partial<AnnixRepSession>,
  ): Promise<void>;
}
