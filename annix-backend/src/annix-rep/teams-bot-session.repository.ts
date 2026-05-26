import { CrudRepository } from "../lib/persistence/crud-repository";
import { TeamsBotSession } from "./entities/teams-bot-session.entity";

export abstract class TeamsBotSessionRepository extends CrudRepository<TeamsBotSession> {
  abstract findBySessionIdAndUser(
    sessionId: string,
    userId: number,
  ): Promise<TeamsBotSession | null>;
  abstract findByCallId(callId: string): Promise<TeamsBotSession | null>;
  abstract findActiveByUser(userId: number): Promise<TeamsBotSession[]>;
  abstract findHistoryByUser(userId: number, limit: number): Promise<TeamsBotSession[]>;
}
