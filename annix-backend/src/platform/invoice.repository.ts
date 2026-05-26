import { CrudRepository } from "../lib/persistence/crud-repository";
import type { InvoiceFilterDto } from "./dto/invoice.dto";
import { PlatformInvoice } from "./entities/invoice.entity";
import type { InvoicePage } from "./invoice.service";

export abstract class InvoiceRepository extends CrudRepository<PlatformInvoice> {
  abstract search(companyId: number, filters: InvoiceFilterDto): Promise<InvoicePage>;
  abstract findByCompanyAndId(
    companyId: number,
    id: number,
    relations?: string[],
  ): Promise<PlatformInvoice | null>;
  abstract findByLegacyScId(id: number): Promise<PlatformInvoice | null>;
  abstract findByLegacyRubberId(id: number): Promise<PlatformInvoice | null>;
}
