import { CrudRepository } from "../lib/persistence/crud-repository";
import { ReinforcementPadStandardEntity } from "./entities/reinforcement-pad-standard.entity";

export abstract class ReinforcementPadStandardRepository extends CrudRepository<ReinforcementPadStandardEntity> {
  abstract findByBranchAndHeader(
    branchNbMm: number,
    headerNbMm: number,
  ): Promise<ReinforcementPadStandardEntity | null>;
}
