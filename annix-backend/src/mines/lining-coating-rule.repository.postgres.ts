import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { LiningCoatingRule } from "./entities/lining-coating-rule.entity";
import { RiskLevel } from "./entities/slurry-profile.entity";
import { LiningCoatingRuleRepository } from "./lining-coating-rule.repository";

@Injectable()
export class PostgresLiningCoatingRuleRepository
  extends TypeOrmCrudRepository<LiningCoatingRule>
  implements LiningCoatingRuleRepository
{
  constructor(@InjectRepository(LiningCoatingRule) repository: Repository<LiningCoatingRule>) {
    super(repository);
  }

  findTopByRisks(
    abrasionLevel: RiskLevel,
    corrosionLevel: RiskLevel,
  ): Promise<LiningCoatingRule | null> {
    return this.repository.findOne({
      where: { abrasionLevel, corrosionLevel },
      order: { priority: "DESC" },
    });
  }

  findAllOrdered(): Promise<LiningCoatingRule[]> {
    return this.repository.find({
      order: { abrasionLevel: "ASC", corrosionLevel: "ASC" },
    });
  }
}
