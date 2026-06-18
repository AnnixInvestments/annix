import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelRegulatoryUpdate } from "./entities/regulatory-update.entity";

export abstract class AnnixSentinelRegulatoryUpdateRepository extends CrudRepository<AnnixSentinelRegulatoryUpdate> {
  abstract findRecent(limit: number): Promise<AnnixSentinelRegulatoryUpdate[]>;
  abstract findByCategoryNewestFirst(category: string): Promise<AnnixSentinelRegulatoryUpdate[]>;
  abstract recentTitles(limit: number): Promise<string[]>;
}
