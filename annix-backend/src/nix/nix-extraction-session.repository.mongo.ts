import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../lib/persistence/transaction-context";
import {
  NixExtractionSession,
  NixExtractionSessionStatus,
} from "./entities/nix-extraction-session.entity";
import { NixExtractionSessionRepository } from "./nix-extraction-session.repository";

@Injectable()
export class MongoNixExtractionSessionRepository
  extends MongoCrudRepository<NixExtractionSession>
  implements NixExtractionSessionRepository
{
  constructor(
    @InjectModel("NixExtractionSession") model: Model<NixExtractionSession>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  async sessionsForOwner(
    ownerUserId: number,
    filters: { sourceModule?: string; status?: NixExtractionSessionStatus },
  ): Promise<NixExtractionSession[]> {
    const query: Record<string, unknown> = { ownerUserId };
    if (filters.sourceModule) {
      query.sourceModule = filters.sourceModule;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    return this.toDomainList(
      await this.documents.find(query).sort({ createdAt: -1 }).limit(50).lean().exec(),
    );
  }

  async sessionsForSource(sourceModule: string, sourceId: number): Promise<NixExtractionSession[]> {
    return this.toDomainList(
      await this.documents.find({ sourceModule, sourceId }).sort({ createdAt: -1 }).lean().exec(),
    );
  }

  async unlinkExtractionsFromSession(sessionId: number): Promise<void> {
    await this.documents.db
      .collection("nix_extractions")
      .updateMany({ session_id: sessionId }, { $set: { session_id: null } });
  }

  async setJobCardId(sessionId: number, jobCardId: number): Promise<void> {
    await this.documents.findByIdAndUpdate(sessionId, { $set: { jobCardId } }).exec();
  }

  withTransaction(context: TransactionContext): MongoNixExtractionSessionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoNixExtractionSessionRepository requires a MongoTransactionContext");
    }
    return new MongoNixExtractionSessionRepository(this.model, context.session);
  }
}
