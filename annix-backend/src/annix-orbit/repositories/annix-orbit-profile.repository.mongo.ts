import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitProfile, AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { AnnixOrbitProfileRepository } from "./annix-orbit-profile.repository";

type ProfileDoc = Record<string, unknown>;
type RefDoc = { _id: number };

@Injectable()
export class MongoAnnixOrbitProfileRepository
  extends MongoCrudRepository<AnnixOrbitProfile>
  implements AnnixOrbitProfileRepository
{
  constructor(
    @InjectModel("AnnixOrbitProfile", ORBIT_CONNECTION) model: Model<AnnixOrbitProfile>,
    @InjectModel("User") private readonly userModel: Model<RefDoc>,
    @InjectModel("Company") private readonly companyModel: Model<RefDoc>,
  ) {
    super(model);
  }

  private async withUser(docs: ProfileDoc[]): Promise<ProfileDoc[]> {
    const ids = [...new Set(docs.map((doc) => doc.userId as number).filter((id) => id != null))];
    if (ids.length === 0) {
      return docs;
    }
    const users = await this.userModel
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    const byId = new Map(users.map((user) => [user._id, user] as const));
    return docs.map((doc) => ({ ...doc, user: byId.get(doc.userId as number) ?? null }));
  }

  private async withCompany(docs: ProfileDoc[]): Promise<ProfileDoc[]> {
    const ids = [...new Set(docs.map((doc) => doc.companyId as number).filter((id) => id != null))];
    if (ids.length === 0) {
      return docs;
    }
    const companies = await this.companyModel
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    const byId = new Map(companies.map((company) => [company._id, company] as const));
    return docs.map((doc) => ({ ...doc, company: byId.get(doc.companyId as number) ?? null }));
  }

  async findByUserId(userId: number): Promise<AnnixOrbitProfile | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByUserIdWithCompany(userId: number): Promise<AnnixOrbitProfile | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    if (!doc) {
      return null;
    }
    const [withCompany] = await this.withCompany([doc]);
    return this.toDomain(withCompany);
  }

  async teamMembers(companyId: number): Promise<AnnixOrbitProfile[]> {
    const docs = await this.documents
      .find({ companyId, userType: AnnixOrbitUserType.COMPANY })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(await this.withUser(docs));
  }

  async findByCompanyWithUser(companyId: number): Promise<AnnixOrbitProfile[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(await this.withUser(docs));
  }

  async findDigestEnabledForCompany(companyId: number): Promise<AnnixOrbitProfile[]> {
    const docs = await this.documents.find({ companyId, digestEnabled: true }).lean().exec();
    return this.toDomainList(await this.withUser(docs));
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

  async findByCalendarFeedToken(token: string): Promise<AnnixOrbitProfile | null> {
    const doc = await this.documents.findOne({ calendarFeedToken: token }).lean().exec();
    return this.toDomain(doc);
  }

  async setPushEnabledForUser(userId: number, enabled: boolean): Promise<void> {
    await this.documents.updateMany({ userId }, { pushEnabled: enabled }).exec();
  }

  async setSelectedTier(userId: number, tier: string): Promise<void> {
    await this.documents.updateMany({ userId }, { selectedTier: tier }).exec();
  }

  async findByUserIds(userIds: number[]): Promise<AnnixOrbitProfile[]> {
    if (userIds.length === 0) {
      return [];
    }
    const docs = await this.documents
      .find({ userId: { $in: userIds } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdentityStatuses(statuses: string[]): Promise<AnnixOrbitProfile[]> {
    if (statuses.length === 0) {
      return [];
    }
    const docs = await this.documents
      .find({ "identityVerification.status": { $in: statuses } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async adminPage(params: {
    userType: AnnixOrbitUserType | null;
    skip: number;
    take: number;
  }): Promise<AnnixOrbitProfile[]> {
    const filter = params.userType ? { userType: params.userType } : {};
    const docs = await this.documents
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(params.skip)
      .limit(params.take)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async adminCount(userType: AnnixOrbitUserType | null): Promise<number> {
    const filter = userType ? { userType } : {};
    return this.documents.countDocuments(filter).exec();
  }
}
