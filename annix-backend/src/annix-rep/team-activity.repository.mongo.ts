import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { TeamActivity, TeamActivityType } from "./entities/team-activity.entity";
import { TeamActivityRepository } from "./team-activity.repository";

@Injectable()
export class MongoTeamActivityRepository
  extends MongoCrudRepository<TeamActivity>
  implements TeamActivityRepository
{
  constructor(@InjectModel("TeamActivity") model: Model<TeamActivity>) {
    super(model);
  }

  async findFeed(
    organizationId: number,
    limit: number,
    offset: number,
    activityTypes: TeamActivityType[] | null,
    userId: number | null,
  ): Promise<TeamActivity[]> {
    const filter: Record<string, unknown> = {
      organizationId,
      isVisibleToTeam: true,
    };
    if (activityTypes?.length) {
      filter.activityType = { $in: activityTypes };
    }
    if (userId) {
      filter.userId = userId;
    }
    const docs = await this.documents
      .find(filter)
      .populate("user")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findFeedForUsers(
    organizationId: number,
    userIds: number[],
    limit: number,
  ): Promise<TeamActivity[]> {
    const docs = await this.documents
      .find({
        organizationId,
        userId: { $in: userIds },
        isVisibleToTeam: true,
      })
      .populate("user")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findUserActivity(
    organizationId: number,
    userId: number,
    limit: number,
  ): Promise<TeamActivity[]> {
    const docs = await this.documents
      .find({ organizationId, userId })
      .populate("user")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
