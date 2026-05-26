import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitProfile, AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { AnnixOrbitProfileRepository } from "./annix-orbit-profile.repository";

@Injectable()
export class MongoAnnixOrbitProfileRepository
  extends MongoCrudRepository<AnnixOrbitProfile>
  implements AnnixOrbitProfileRepository
{
  constructor(@InjectModel("AnnixOrbitProfile") model: Model<AnnixOrbitProfile>) {
    super(model);
  }

  async findByUserId(userId: number): Promise<AnnixOrbitProfile | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByUserIdWithCompany(userId: number): Promise<AnnixOrbitProfile | null> {
    const doc = await this.documents.findOne({ userId }).populate("company").lean().exec();
    return this.toDomain(doc);
  }

  async teamMembers(companyId: number): Promise<AnnixOrbitProfile[]> {
    const docs = await this.documents
      .find({ companyId, userType: AnnixOrbitUserType.COMPANY })
      .sort({ createdAt: 1 })
      .populate("user")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByCompanyWithUser(companyId: number): Promise<AnnixOrbitProfile[]> {
    const docs = await this.documents.find({ companyId }).populate("user").lean().exec();
    return this.toDomainList(docs);
  }

  async findDigestEnabledForCompany(companyId: number): Promise<AnnixOrbitProfile[]> {
    const docs = await this.documents
      .find({ companyId, digestEnabled: true })
      .populate("user")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async digestEnabledCompanyIds(): Promise<number[]> {
    const ids = await this.documents.distinct("companyId", { digestEnabled: true }).exec();
    return ids as number[];
  }

  async findByValidDeletionToken(token: string, now: Date): Promise<AnnixOrbitProfile | null> {
    const doc = await this.documents
      .findOne({ deletionToken: token, deletionTokenExpires: { $gt: now } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async setPushEnabledForUser(userId: number, enabled: boolean): Promise<void> {
    await this.documents.updateMany({ userId }, { pushEnabled: enabled }).exec();
  }
}
