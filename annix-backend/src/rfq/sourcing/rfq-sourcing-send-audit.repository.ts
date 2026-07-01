import type { PaginatedResult } from "../../lib/dto/pagination-query.dto";
import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RfqSourcingSendAudit } from "./entities/rfq-sourcing-send-audit.entity";

export abstract class RfqSourcingSendAuditRepository extends CrudRepository<RfqSourcingSendAudit> {
  abstract findBySession(sessionId: number): Promise<RfqSourcingSendAudit[]>;
  abstract pageForCompany(
    companyId: number,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<RfqSourcingSendAudit>>;
}
