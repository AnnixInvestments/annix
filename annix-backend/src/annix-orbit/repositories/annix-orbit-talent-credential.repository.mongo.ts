import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitTalentCredential } from "../entities/annix-orbit-talent-credential.entity";
import { AnnixOrbitTalentCredentialRepository } from "./annix-orbit-talent-credential.repository";

@Injectable()
export class MongoAnnixOrbitTalentCredentialRepository
  extends MongoCrudRepository<AnnixOrbitTalentCredential>
  implements AnnixOrbitTalentCredentialRepository
{
  constructor(
    @InjectModel("AnnixOrbitTalentCredential", ORBIT_CONNECTION)
    model: Model<AnnixOrbitTalentCredential>,
  ) {
    super(model);
  }

  async findByCandidate(candidateId: number): Promise<AnnixOrbitTalentCredential[]> {
    const docs = await this.documents.find({ candidateId }).sort({ expiresAt: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async listForCandidates(candidateIds: number[]): Promise<AnnixOrbitTalentCredential[]> {
    if (candidateIds.length === 0) return [];
    const docs = await this.documents
      .find({ candidateId: { $in: candidateIds } })
      .sort({ expiresAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async expiringForCompany(
    companyId: number,
    dayStart: string,
    dayEnd: string,
  ): Promise<AnnixOrbitTalentCredential[]> {
    const docs = await this.documents
      .find({ companyId, expiresAt: { $gte: dayStart, $lte: dayEnd } })
      .sort({ expiresAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
  }
}
