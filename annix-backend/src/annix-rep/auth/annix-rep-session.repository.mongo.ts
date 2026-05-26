import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixRepSessionRepository } from "./annix-rep-session.repository";
import { AnnixRepSession } from "./entities/annix-rep-session.entity";

@Injectable()
export class MongoAnnixRepSessionRepository
  extends MongoCrudRepository<AnnixRepSession>
  implements AnnixRepSessionRepository
{
  constructor(@InjectModel("AnnixRepSession") model: Model<AnnixRepSession>) {
    super(model);
  }

  async findActiveByToken(sessionToken: string): Promise<AnnixRepSession | null> {
    const doc = await this.documents.findOne({ sessionToken, isActive: true }).lean().exec();
    return this.toDomain(doc);
  }

  async findActiveByTokenWithUser(sessionToken: string): Promise<AnnixRepSession | null> {
    const doc = await this.documents
      .findOne({ sessionToken, isActive: true })
      .populate("user")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async updateActiveUserSessions(userId: number, updates: Partial<AnnixRepSession>): Promise<void> {
    await this.documents
      .updateMany({ userId, isActive: true }, { $set: updates as Record<string, unknown> })
      .exec();
  }
}
