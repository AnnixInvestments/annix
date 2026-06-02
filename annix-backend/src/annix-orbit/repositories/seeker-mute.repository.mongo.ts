import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerMute } from "../entities/seeker-mute.entity";
import { SeekerMuteRepository } from "./seeker-mute.repository";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class MongoSeekerMuteRepository
  extends MongoCrudRepository<SeekerMute>
  implements SeekerMuteRepository
{
  constructor(@InjectModel("SeekerMute", ORBIT_CONNECTION) model: Model<SeekerMute>) {
    super(model);
  }

  async findByCandidateAndCompany(
    candidateId: number,
    company: string,
  ): Promise<SeekerMute | null> {
    const doc = await this.documents
      .findOne({
        candidateId,
        companyName: { $regex: `^${escapeRegex(company)}$`, $options: "i" },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByCandidateAndCategory(
    candidateId: number,
    category: string,
  ): Promise<SeekerMute | null> {
    const doc = await this.documents
      .findOne({
        candidateId,
        category: { $regex: `^${escapeRegex(category)}$`, $options: "i" },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async listForCandidates(candidateIds: number[]): Promise<SeekerMute[]> {
    if (candidateIds.length === 0) return [];
    const docs = await this.documents
      .find({ candidateId: { $in: candidateIds } })
      .sort({ mutedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
  }
}
