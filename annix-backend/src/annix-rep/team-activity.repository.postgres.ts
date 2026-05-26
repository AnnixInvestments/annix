import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { TeamActivity, TeamActivityType } from "./entities/team-activity.entity";
import { TeamActivityRepository } from "./team-activity.repository";

@Injectable()
export class PostgresTeamActivityRepository
  extends TypeOrmCrudRepository<TeamActivity>
  implements TeamActivityRepository
{
  constructor(@InjectRepository(TeamActivity) repository: Repository<TeamActivity>) {
    super(repository);
  }

  findFeed(
    organizationId: number,
    limit: number,
    offset: number,
    activityTypes: TeamActivityType[] | null,
    userId: number | null,
  ): Promise<TeamActivity[]> {
    const qb = this.repository
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.user", "user")
      .where("activity.organization_id = :orgId", { orgId: organizationId })
      .andWhere("activity.is_visible_to_team = true");

    if (activityTypes?.length) {
      qb.andWhere("activity.activity_type IN (:...types)", { types: activityTypes });
    }

    if (userId) {
      qb.andWhere("activity.user_id = :userId", { userId });
    }

    return qb.orderBy("activity.created_at", "DESC").take(limit).skip(offset).getMany();
  }

  findFeedForUsers(
    organizationId: number,
    userIds: number[],
    limit: number,
  ): Promise<TeamActivity[]> {
    return this.repository
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.user", "user")
      .where("activity.organization_id = :orgId", { orgId: organizationId })
      .andWhere("activity.user_id IN (:...userIds)", { userIds })
      .andWhere("activity.is_visible_to_team = true")
      .orderBy("activity.created_at", "DESC")
      .take(limit)
      .getMany();
  }

  findUserActivity(organizationId: number, userId: number, limit: number): Promise<TeamActivity[]> {
    return this.repository.find({
      where: { organizationId, userId },
      relations: ["user"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
