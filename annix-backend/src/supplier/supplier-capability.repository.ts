import { CrudRepository } from "../lib/persistence/crud-repository";
import { SupplierCapability } from "./entities/supplier-capability.entity";

export abstract class SupplierCapabilityRepository extends CrudRepository<SupplierCapability> {
  abstract findActiveBySupplierIdsWithRelations(
    supplierProfileIds: number[],
  ): Promise<SupplierCapability[]>;
}
