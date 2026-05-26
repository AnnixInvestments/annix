import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { TeamMember, TeamMemberStatus } from "./entities/team-member.entity";
import { TeamMemberRepository } from "./team-member.repository";

@Injectable()
export class MongoTeamMemberRepository
  extends MongoCrudRepository<TeamMember>
  implements TeamMemberRepository
{
  constructor(@InjectModel("TeamMember") model: Model<TeamMember>) {
    super(model);
  }

  async findByOrganization(organizationId: number): Promise<TeamMember[]> {
    const docs = await this.documents
      .find({ organizationId })
      .populate(["user", "reportsTo"])
      .sort({ joinedAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveByOrganization(organizationId: number): Promise<TeamMember[]> {
    const docs = await this.documents
      .find({ organizationId, status: TeamMemberStatus.ACTIVE })
      .populate(["user", "reportsTo"])
      .sort({ joinedAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdWithRelations(id: number): Promise<TeamMember | null> {
    const doc = await this.documents
      .findById(id)
      .populate(["user", "reportsTo", "organization"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByOrganizationAndUser(
    organizationId: number,
    userId: number,
  ): Promise<TeamMember | null> {
    const doc = await this.documents
      .findOne({ organizationId, userId })
      .populate(["user", "reportsTo", "organization"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByUserAnyOrganization(userId: number): Promise<TeamMember | null> {
    const doc = await this.documents
      .findOne({ userId })
      .populate(["user", "reportsTo", "organization"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findDirectReports(organizationId: number, reportsToId: number): Promise<TeamMember[]> {
    const docs = await this.documents
      .find({ organizationId, reportsToId })
      .populate("user")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByUserWithOrganization(userId: number): Promise<TeamMember | null> {
    const doc = await this.documents.findOne({ userId }).populate("organization").lean().exec();
    return this.toDomain(doc);
  }

  async findFirstByOrganizationWithUser(organizationId: number): Promise<TeamMember | null> {
    const doc = await this.documents.findOne({ organizationId }).populate("user").lean().exec();
    return this.toDomain(doc);
  }

  countByOrganization(organizationId: number): Promise<number> {
    return this.documents.countDocuments({ organizationId }).exec();
  }

  countActiveByOrganization(organizationId: number): Promise<number> {
    return this.documents
      .countDocuments({ organizationId, status: TeamMemberStatus.ACTIVE })
      .exec();
  }

  async findActiveByOrganizationWithUser(organizationId: number): Promise<TeamMember[]> {
    const docs = await this.documents
      .find({ organizationId, status: TeamMemberStatus.ACTIVE })
      .populate("user")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
