import { CrudRepository } from "../lib/persistence/crud-repository";
import { CustomerPreferredSupplier } from "./entities/customer-preferred-supplier.entity";

export abstract class CustomerPreferredSupplierRepository extends CrudRepository<CustomerPreferredSupplier> {
  abstract findActiveByCompany(
    customerCompanyId: number,
    relations?: string[],
  ): Promise<CustomerPreferredSupplier[]>;
  abstract findActiveByCompanyAndSupplier(
    customerCompanyId: number,
    supplierProfileId: number,
  ): Promise<CustomerPreferredSupplier | null>;
  abstract findByCompanyAndSupplier(
    customerCompanyId: number,
    supplierProfileId: number,
  ): Promise<CustomerPreferredSupplier | null>;
  abstract findActiveByIdInCompany(
    id: number,
    customerCompanyId: number,
  ): Promise<CustomerPreferredSupplier | null>;
  abstract findByIdInCompany(
    id: number,
    customerCompanyId: number,
  ): Promise<CustomerPreferredSupplier | null>;
}
