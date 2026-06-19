import { CrudRepository } from "../lib/persistence/crud-repository";
import { SupplierCapability } from "./entities/supplier-capability.entity";

export abstract class SupplierCapabilityRepository extends CrudRepository<SupplierCapability> {
  abstract findActiveBySupplierIdsWithRelations(
    supplierProfileIds: number[],
  ): Promise<SupplierCapability[]>;
  abstract findActiveBySupplier(supplierProfileId: number): Promise<SupplierCapability[]>;
  abstract findBySupplier(supplierProfileId: number): Promise<SupplierCapability[]>;
  abstract removeById(id: number): Promise<void>;
}
