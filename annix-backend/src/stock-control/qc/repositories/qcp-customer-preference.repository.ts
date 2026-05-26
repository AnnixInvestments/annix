import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcpCustomerPreference } from "../entities/qcp-customer-preference.entity";

export abstract class QcpCustomerPreferenceRepository extends CrudRepository<QcpCustomerPreference> {
  abstract findByCompanyCustomerAndType(
    companyId: number,
    customerName: string,
    planType: string,
  ): Promise<QcpCustomerPreference | null>;
  abstract findByCompanyAndCustomer(
    companyId: number,
    customerName: string,
  ): Promise<QcpCustomerPreference | null>;
  abstract findForCompanyCustomer(
    companyId: number,
    customerName: string,
    planType: string | undefined,
  ): Promise<QcpCustomerPreference[]>;
  abstract updateById(id: number, updates: Partial<QcpCustomerPreference>): Promise<void>;
}
