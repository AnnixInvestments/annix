import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { TeamsBotSession, TeamsBotSessionStatus } from "./entities/teams-bot-session.entity";
import { TeamsBotSessionRepository } from "./teams-bot-session.repository";

@Injectable()
export class MongoTeamsBotSessionRepository
  extends MongoCrudRepository<TeamsBotSession>
  implements TeamsBotSessionRepository
{
  constructor(@InjectModel("TeamsBotSession") model: Model<TeamsBotSession>) {
    super(model);
  }

  async findBySessionIdAndUser(sessionId: string, userId: number): Promise<TeamsBotSession | null> {
    const doc = await this.documents.findOne({ sessionId, userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByCallId(callId: string): Promise<TeamsBotSession | null> {
    const doc = await this.documents.findOne({ callId }).lean().exec();
    return this.toDomain(doc);
  }

  async findActiveByUser(userId: number): Promise<TeamsBotSession[]> {
    const docs = await this.documents
      .find({
        userId,
        status: { $in: [TeamsBotSessionStatus.JOINING, TeamsBotSessionStatus.ACTIVE] },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findHistoryByUser(userId: number, limit: number): Promise<TeamsBotSession[]> {
    const docs = await this.documents
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
