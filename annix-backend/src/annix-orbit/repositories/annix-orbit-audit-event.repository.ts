import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitAuditEvent } from "../entities/annix-orbit-audit-event.entity";

export abstract class AnnixOrbitAuditEventRepository extends CrudRepository<AnnixOrbitAuditEvent> {
  abstract findForCandidate(
    candidateId: number,
    companyId: number,
  ): Promise<AnnixOrbitAuditEvent[]>;
}
