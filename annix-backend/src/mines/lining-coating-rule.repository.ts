import { CrudRepository } from "../lib/persistence/crud-repository";
import { LiningCoatingRule } from "./entities/lining-coating-rule.entity";
import { RiskLevel } from "./entities/slurry-profile.entity";

export abstract class LiningCoatingRuleRepository extends CrudRepository<LiningCoatingRule> {
  abstract findTopByRisks(
    abrasionLevel: RiskLevel,
    corrosionLevel: RiskLevel,
  ): Promise<LiningCoatingRule | null>;
  abstract findAllOrdered(): Promise<LiningCoatingRule[]>;
}
