import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitComplianceItem } from "../entities/annix-orbit-compliance-item.entity";

export abstract class AnnixOrbitComplianceItemRepository extends CrudRepository<AnnixOrbitComplianceItem> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitComplianceItem[]>;
  abstract findByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<AnnixOrbitComplianceItem | null>;
}
