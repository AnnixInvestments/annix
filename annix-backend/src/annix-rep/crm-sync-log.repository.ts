import { CrudRepository } from "../lib/persistence/crud-repository";
import { CrmSyncLog } from "./entities/crm-sync-log.entity";

export abstract class CrmSyncLogRepository extends CrudRepository<CrmSyncLog> {
  abstract findByConfigPaginated(
    configId: number,
    limit: number,
    offset: number,
  ): Promise<{ logs: CrmSyncLog[]; total: number }>;
}
