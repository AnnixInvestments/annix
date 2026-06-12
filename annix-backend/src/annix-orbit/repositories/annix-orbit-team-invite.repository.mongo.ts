import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitTeamInvite } from "../entities/annix-orbit-team-invite.entity";
import { AnnixOrbitTeamInviteRepository } from "./annix-orbit-team-invite.repository";

@Injectable()
export class MongoAnnixOrbitTeamInviteRepository
  extends MongoCrudRepository<AnnixOrbitTeamInvite>
  implements AnnixOrbitTeamInviteRepository
{
  constructor(@InjectModel("AnnixOrbitTeamInvite") model: Model<AnnixOrbitTeamInvite>) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitTeamInvite[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTeamInvite | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByToken(token: string): Promise<AnnixOrbitTeamInvite | null> {
    const doc = await this.documents.findOne({ token }).lean().exec();
    return this.toDomain(doc);
  }
}
