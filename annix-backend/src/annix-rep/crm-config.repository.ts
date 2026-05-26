import { CrudRepository } from "../lib/persistence/crud-repository";
import { CrmConfig, CrmType } from "./entities/crm-config.entity";

export abstract class CrmConfigRepository extends CrudRepository<CrmConfig> {
  abstract findActive(): Promise<CrmConfig[]>;
  abstract findByUserAndType(userId: number, crmType: CrmType): Promise<CrmConfig | null>;
  abstract findByIdAndUser(id: number, userId: number): Promise<CrmConfig | null>;
  abstract findByUser(userId: number): Promise<CrmConfig[]>;
}
