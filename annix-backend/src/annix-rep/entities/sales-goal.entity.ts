import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export enum GoalPeriod {
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
}

@Entity("annix_rep_sales_goals")
export class SalesGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({
    name: "period",
    type: "enum",
    enum: GoalPeriod,
    default: GoalPeriod.MONTHLY,
  })
  period: GoalPeriod;

  @Column({ name: "meetings_target", type: "int", nullable: true })
  meetingsTarget: number | null;

  @Column({ name: "visits_target", type: "int", nullable: true })
  visitsTarget: number | null;

  @Column({ name: "new_prospects_target", type: "int", nullable: true })
  newProspectsTarget: number | null;

  @Column({ name: "revenue_target", type: "decimal", precision: 12, scale: 2, nullable: true })
  revenueTarget: number | null;

  @Column({ name: "deals_won_target", type: "int", nullable: true })
  dealsWonTarget: number | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
