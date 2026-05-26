import { CrudRepository } from "../lib/persistence/crud-repository";
import { GoalPeriod, SalesGoal } from "./entities/sales-goal.entity";

export abstract class SalesGoalRepository extends CrudRepository<SalesGoal> {
  abstract findByUser(userId: number): Promise<SalesGoal[]>;
  abstract findByUserAndPeriod(userId: number, period: GoalPeriod): Promise<SalesGoal | null>;
  abstract deleteByUserAndPeriod(userId: number, period: GoalPeriod): Promise<number>;
}
