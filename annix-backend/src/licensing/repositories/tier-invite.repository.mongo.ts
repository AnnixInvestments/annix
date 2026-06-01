import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { TierInvite } from "../entities/tier-invite.entity";
import { TierInviteRepository } from "./tier-invite.repository";

@Injectable()
export class MongoTierInviteRepository
  extends MongoCrudRepository<TierInvite>
  implements TierInviteRepository
{
  constructor(@InjectModel("TierInvite") model: Model<TierInvite>) {
    super(model);
  }

  async findByModuleKey(moduleKey: string): Promise<TierInvite[]> {
    const docs = await this.documents.find({ moduleKey }).sort({ _id: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByToken(token: string): Promise<TierInvite | null> {
    const doc = await this.documents.findOne({ token }).lean().exec();
    return this.toDomain(doc);
  }
}
