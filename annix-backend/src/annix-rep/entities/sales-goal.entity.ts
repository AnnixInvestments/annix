import { User } from "../../user/entities/user.entity";

export enum GoalPeriod {
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
}

export class SalesGoal {
  id: number;

  user: User;

  userId: number;

  period: GoalPeriod;

  meetingsTarget: number | null;

  visitsTarget: number | null;

  newProspectsTarget: number | null;

  revenueTarget: number | null;

  dealsWonTarget: number | null;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
