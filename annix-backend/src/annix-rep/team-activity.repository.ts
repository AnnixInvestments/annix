import { CrudRepository } from "../lib/persistence/crud-repository";
import { TeamActivity, TeamActivityType } from "./entities/team-activity.entity";

export abstract class TeamActivityRepository extends CrudRepository<TeamActivity> {
  abstract findFeed(
    organizationId: number,
    limit: number,
    offset: number,
    activityTypes: TeamActivityType[] | null,
    userId: number | null,
  ): Promise<TeamActivity[]>;
  abstract findFeedForUsers(
    organizationId: number,
    userIds: number[],
    limit: number,
  ): Promise<TeamActivity[]>;
  abstract findUserActivity(
    organizationId: number,
    userId: number,
    limit: number,
  ): Promise<TeamActivity[]>;
}
