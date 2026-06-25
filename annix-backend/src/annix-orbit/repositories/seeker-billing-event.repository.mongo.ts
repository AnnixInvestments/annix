import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isObject, isString, keys } from "es-toolkit/compat";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerBillingEvent } from "../entities/seeker-billing-event.entity";
import { SeekerBillingEventRepository } from "./seeker-billing-event.repository";

function isDuplicatePaystackEventError(error: unknown): boolean {
  if (!isObject(error)) {
    return false;
  }
  const candidate = error as {
    code?: number;
    keyPattern?: Record<string, unknown>;
    message?: string;
  };
  if (candidate.code !== 11000) {
    return false;
  }
  if (candidate.keyPattern) {
    return keys(candidate.keyPattern).includes("paystackEventId");
  }
  return isString(candidate.message) && /paystackEventId/.test(candidate.message);
}

@Injectable()
export class MongoSeekerBillingEventRepository
  extends MongoCrudRepository<SeekerBillingEvent>
  implements SeekerBillingEventRepository
{
  constructor(
    @InjectModel("SeekerBillingEvent", ORBIT_CONNECTION) model: Model<SeekerBillingEvent>,
  ) {
    super(model);
  }

  async existsByPaystackEventId(paystackEventId: string): Promise<boolean> {
    const existing = await this.documents.findOne({ paystackEventId }).select("_id").lean().exec();
    return existing != null;
  }

  async insertIfNew(event: Partial<SeekerBillingEvent>): Promise<boolean> {
    try {
      await this.create(event);
      return true;
    } catch (error) {
      if (isDuplicatePaystackEventError(error)) {
        return false;
      }
      throw error;
    }
  }

  async deleteForUser(userId: number): Promise<number> {
    const result = await this.documents.deleteMany({ userId }).exec();
    return result.deletedCount ?? 0;
  }

  async recentForUser(userId: number, limit: number): Promise<SeekerBillingEvent[]> {
    const docs = await this.documents
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
