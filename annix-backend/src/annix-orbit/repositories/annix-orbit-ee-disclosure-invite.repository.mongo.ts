import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitEeDisclosureInvite } from "../entities/annix-orbit-ee-disclosure-invite.entity";
import { AnnixOrbitEeDisclosureInviteRepository } from "./annix-orbit-ee-disclosure-invite.repository";

@Injectable()
export class MongoAnnixOrbitEeDisclosureInviteRepository
  extends MongoCrudRepository<AnnixOrbitEeDisclosureInvite>
  implements AnnixOrbitEeDisclosureInviteRepository
{
  constructor(
    @InjectModel("AnnixOrbitEeDisclosureInvite")
    model: Model<AnnixOrbitEeDisclosureInvite>,
  ) {
    super(model);
  }

  async findActiveInvite(
    candidateId: number,
    jobPostingId: number,
    now: Date,
  ): Promise<AnnixOrbitEeDisclosureInvite | null> {
    const doc = await this.documents
      .findOne({
        candidateId,
        jobPostingId,
        usedAt: null,
        expiresAt: { $gt: now },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByToken(token: string): Promise<AnnixOrbitEeDisclosureInvite | null> {
    const doc = await this.documents.findOne({ token }).lean().exec();
    return this.toDomain(doc);
  }

  async findByTokenWithRelations(token: string): Promise<AnnixOrbitEeDisclosureInvite | null> {
    const doc = await this.documents
      .findOne({ token })
      .populate(["candidate", "jobPosting"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async markUsed(id: number, usedAt: Date): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { usedAt }).exec();
  }
}
