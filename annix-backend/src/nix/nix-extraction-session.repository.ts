import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import {
  NixExtractionSession,
  NixExtractionSessionStatus,
} from "./entities/nix-extraction-session.entity";

export abstract class NixExtractionSessionRepository extends CrudRepository<NixExtractionSession> {
  abstract withTransaction(context: TransactionContext): NixExtractionSessionRepository;

  abstract sessionsForOwner(
    ownerUserId: number,
    filters: { sourceModule?: string; status?: NixExtractionSessionStatus },
  ): Promise<NixExtractionSession[]>;

  abstract sessionsForSource(
    sourceModule: string,
    sourceId: number,
  ): Promise<NixExtractionSession[]>;

  abstract unlinkExtractionsFromSession(sessionId: number): Promise<void>;

  abstract setJobCardId(sessionId: number, jobCardId: number): Promise<void>;
}
