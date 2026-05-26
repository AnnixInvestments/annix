import { CrudRepository } from "../lib/persistence/crud-repository";
import { CustomerBlockedSupplier } from "./entities/customer-blocked-supplier.entity";

export abstract class CustomerBlockedSupplierRepository extends CrudRepository<CustomerBlockedSupplier> {
  abstract findActiveByCompany(customerCompanyId: number): Promise<CustomerBlockedSupplier[]>;
  abstract findActiveByCompanyAndSupplier(
    customerCompanyId: number,
    supplierProfileId: number,
  ): Promise<CustomerBlockedSupplier | null>;
}
