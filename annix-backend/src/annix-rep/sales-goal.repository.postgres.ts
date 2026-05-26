import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { GoalPeriod, SalesGoal } from "./entities/sales-goal.entity";
import { SalesGoalRepository } from "./sales-goal.repository";

@Injectable()
export class PostgresSalesGoalRepository
  extends TypeOrmCrudRepository<SalesGoal>
  implements SalesGoalRepository
{
  constructor(@InjectRepository(SalesGoal) repository: Repository<SalesGoal>) {
    super(repository);
  }

  findByUser(userId: number): Promise<SalesGoal[]> {
    return this.repository.find({
      where: { userId },
      order: { period: "ASC" },
    });
  }

  findByUserAndPeriod(userId: number, period: GoalPeriod): Promise<SalesGoal | null> {
    return this.repository.findOne({ where: { userId, period } });
  }

  async deleteByUserAndPeriod(userId: number, period: GoalPeriod): Promise<number> {
    const result = await this.repository.delete({ userId, period });
    return result.affected ?? 0;
  }
}
