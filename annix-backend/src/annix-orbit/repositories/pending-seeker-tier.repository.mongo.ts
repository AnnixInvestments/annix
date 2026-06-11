import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { PendingSeekerTier } from "../entities/pending-seeker-tier.entity";
import { PendingSeekerTierRepository } from "./pending-seeker-tier.repository";

@Injectable()
export class MongoPendingSeekerTierRepository
  extends MongoCrudRepository<PendingSeekerTier>
  implements PendingSeekerTierRepository
{
  constructor(@InjectModel("PendingSeekerTier", ORBIT_CONNECTION) model: Model<PendingSeekerTier>) {
    super(model);
  }

  async findByEmailNormalized(email: string): Promise<PendingSeekerTier | null> {
    const doc = await this.documents.findOne({ emailNormalized: email }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async deleteByEmailNormalized(email: string): Promise<void> {
    await this.documents.deleteOne({ emailNormalized: email }).exec();
  }
}
