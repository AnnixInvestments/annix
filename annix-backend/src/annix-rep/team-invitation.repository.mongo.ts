import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { TeamInvitation, TeamInvitationStatus } from "./entities/team-invitation.entity";
import { TeamInvitationRepository } from "./team-invitation.repository";

@Injectable()
export class MongoTeamInvitationRepository
  extends MongoCrudRepository<TeamInvitation>
  implements TeamInvitationRepository
{
  constructor(@InjectModel("TeamInvitation") model: Model<TeamInvitation>) {
    super(model);
  }

  async findPendingByOrganization(organizationId: number): Promise<TeamInvitation[]> {
    const docs = await this.documents
      .find({ organizationId, status: TeamInvitationStatus.PENDING })
      .populate(["invitedBy", "territory"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByToken(token: string): Promise<TeamInvitation | null> {
    const doc = await this.documents
      .findOne({ token })
      .populate(["organization", "invitedBy", "territory"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdWithRelations(id: number): Promise<TeamInvitation | null> {
    const doc = await this.documents
      .findById(id)
      .populate(["organization", "invitedBy", "territory"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPendingByOrganizationAndEmail(
    organizationId: number,
    email: string,
  ): Promise<TeamInvitation | null> {
    const doc = await this.documents
      .findOne({ organizationId, email, status: TeamInvitationStatus.PENDING })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async expireOldPending(asOf: Date): Promise<number> {
    const result = await this.documents
      .updateMany(
        { status: TeamInvitationStatus.PENDING, expiresAt: { $lt: asOf } },
        { $set: { status: TeamInvitationStatus.EXPIRED } },
      )
      .exec();
    return result.modifiedCount ?? 0;
  }
}
