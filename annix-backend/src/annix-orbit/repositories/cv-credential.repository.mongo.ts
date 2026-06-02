import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CvCredential } from "../entities/cv-credential.entity";
import { CvCredentialRepository } from "./cv-credential.repository";

@Injectable()
export class MongoCvCredentialRepository
  extends MongoCrudRepository<CvCredential>
  implements CvCredentialRepository
{
  constructor(@InjectModel("CvCredential", ORBIT_CONNECTION) model: Model<CvCredential>) {
    super(model);
  }

  async listForCandidates(candidateIds: number[]): Promise<CvCredential[]> {
    if (candidateIds.length === 0) return [];
    const docs = await this.documents
      .find({ candidateId: { $in: candidateIds } })
      .sort({ expiresAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByCandidate(candidateId: number): Promise<CvCredential[]> {
    const docs = await this.documents.find({ candidateId }).lean().exec();
    return this.toDomainList(docs);
  }

  async validForCandidates(candidateIds: number[], today: string): Promise<CvCredential[]> {
    if (candidateIds.length === 0) return [];
    const docs = await this.documents
      .find({
        candidateId: { $in: candidateIds },
        $or: [{ expiresAt: null }, { expiresAt: { $gte: today } }],
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async expiringBetween(dayStart: string, dayEnd: string): Promise<CvCredential[]> {
    const docs = await this.documents
      .find({ expiresAt: { $gte: dayStart, $lte: dayEnd } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
  }
}
