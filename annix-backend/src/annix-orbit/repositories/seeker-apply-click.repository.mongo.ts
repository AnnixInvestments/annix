import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerApplyClick } from "../entities/seeker-apply-click.entity";
import { SeekerApplyClickRepository } from "./seeker-apply-click.repository";

@Injectable()
export class MongoSeekerApplyClickRepository
  extends MongoCrudRepository<SeekerApplyClick>
  implements SeekerApplyClickRepository
{
  constructor(@InjectModel("SeekerApplyClick") model: Model<SeekerApplyClick>) {
    super(model);
  }

  async findRecentClick(
    candidateId: number,
    externalJobId: number,
    cutoff: Date,
  ): Promise<SeekerApplyClick | null> {
    const doc = await this.documents
      .findOne({ candidateId, externalJobId, clickedAt: { $gte: cutoff } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
