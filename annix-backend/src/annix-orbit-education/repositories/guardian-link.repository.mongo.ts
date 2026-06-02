import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { GuardianLink } from "../entities/guardian-link.entity";
import { GuardianLinkRepository } from "./guardian-link.repository";

@Injectable()
export class MongoGuardianLinkRepository
  extends MongoCrudRepository<GuardianLink>
  implements GuardianLinkRepository
{
  constructor(@InjectModel("GuardianLink", ORBIT_CONNECTION) model: Model<GuardianLink>) {
    super(model);
  }

  async orderedForProfile(educationProfileId: string): Promise<GuardianLink[]> {
    const docs = await this.documents
      .find({ educationProfileId })
      .sort({ invitedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByProfileAndEmail(
    educationProfileId: string,
    guardianEmail: string,
  ): Promise<GuardianLink | null> {
    const doc = await this.documents.findOne({ educationProfileId, guardianEmail }).lean().exec();
    return this.toDomain(doc);
  }

  async allOrderedByInvitedAt(): Promise<GuardianLink[]> {
    const docs = await this.documents.find().sort({ invitedAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
