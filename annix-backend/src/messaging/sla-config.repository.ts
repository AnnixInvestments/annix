import { CrudRepository } from "../lib/persistence/crud-repository";
import { SlaConfig } from "./entities/sla-config.entity";

export abstract class SlaConfigRepository extends CrudRepository<SlaConfig> {
  abstract findFirst(): Promise<SlaConfig | null>;
}
