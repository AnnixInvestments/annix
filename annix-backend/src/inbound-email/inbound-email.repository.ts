import { CrudRepository } from "../lib/persistence/crud-repository";
import { InboundEmail, InboundEmailStatus } from "./entities/inbound-email.entity";

export interface InboundEmailPage {
  items: InboundEmail[];
  total: number;
}

export interface InboundEmailFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  documentType?: string;
  page?: number;
  limit?: number;
}

export interface InboundEmailStatusCounts {
  total: number;
  completed: number;
  failed: number;
  unclassified: number;
  pending: number;
}

export abstract class InboundEmailRepository extends CrudRepository<InboundEmail> {
  abstract existsByMessageId(messageId: string): Promise<boolean>;
  abstract updateStatus(
    id: number,
    status: InboundEmailStatus,
    errorMessage: string | null,
  ): Promise<void>;
  abstract listByAppAndCompany(
    app: string,
    companyId: number,
    filters: InboundEmailFilters,
  ): Promise<InboundEmailPage>;
  abstract statsByAppAndCompany(app: string, companyId: number): Promise<InboundEmailStatusCounts>;
}
