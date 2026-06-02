import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitTalentCandidate } from "../entities/annix-orbit-talent-candidate.entity";
import { AnnixOrbitTalentCandidateRepository } from "./annix-orbit-talent-candidate.repository";

@Injectable()
export class MongoAnnixOrbitTalentCandidateRepository
  extends MongoCrudRepository<AnnixOrbitTalentCandidate>
  implements AnnixOrbitTalentCandidateRepository
{
  constructor(
    @InjectModel("AnnixOrbitTalentCandidate", ORBIT_CONNECTION)
    model: Model<AnnixOrbitTalentCandidate>,
  ) {
    super(model);
  }

  async findVisibleForCompany(
    companyId: number,
    userId: number,
  ): Promise<AnnixOrbitTalentCandidate[]> {
    const docs = await this.documents
      .find({
        companyId,
        $or: [{ visibility: { $ne: "private" } }, { ownerUserId: userId }],
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<AnnixOrbitTalentCandidate | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
