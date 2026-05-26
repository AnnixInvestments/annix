import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SupplierSession } from "./entities/supplier-session.entity";
import { SupplierSessionRepository } from "./supplier-session.repository";

@Injectable()
export class MongoSupplierSessionRepository
  extends MongoCrudRepository<SupplierSession>
  implements SupplierSessionRepository
{
  constructor(@InjectModel("SupplierSession") model: Model<SupplierSession>) {
    super(model);
  }

  async findActiveByToken(
    sessionToken: string,
    relations?: string[],
  ): Promise<SupplierSession | null> {
    const doc = await this.documents
      .findOne({ sessionToken, isActive: true })
      .populate(relations ?? [])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async updateActiveByProfile(
    profileIdField: string,
    profileId: number,
    patch: DeepPartial<SupplierSession>,
  ): Promise<void> {
    await this.documents
      .updateMany(
        { [profileIdField]: profileId, isActive: true },
        { $set: patch as Record<string, unknown> },
      )
      .exec();
  }

  countActiveSince(currentTime: Date, activitySince: Date): Promise<number> {
    return this.documents
      .countDocuments({
        isActive: true,
        expiresAt: { $gt: currentTime },
        lastActivity: { $gt: activitySince },
      })
      .exec();
  }
}
