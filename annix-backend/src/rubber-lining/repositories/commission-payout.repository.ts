import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CommissionPayout, PayoutStatus } from "../entities/commission-payout.entity";

export interface PayoutListFilters {
  companyId?: number;
  commissionType?: string;
  status?: PayoutStatus;
  salesRepId?: number;
  affiliateId?: number;
}

export abstract class CommissionPayoutRepository extends CrudRepository<CommissionPayout> {
  abstract build(data: Partial<CommissionPayout>): CommissionPayout;
  abstract findByCompanyId(companyId: number): Promise<CommissionPayout[]>;
  abstract findPendingByCompanyId(companyId: number): Promise<CommissionPayout[]>;
  abstract findByInvoiceId(invoiceId: number): Promise<CommissionPayout[]>;
}
