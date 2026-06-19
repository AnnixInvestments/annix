import { Company } from "../../platform/entities/company.entity";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { IssuanceSession } from "./issuance-session.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockIssuance } from "./stock-issuance.entity";
import { StockItem } from "./stock-item.entity";
import { SupplierCertificate } from "./supplier-certificate.entity";

export class IssuanceBatchRecord {
  id: number;

  company: StockControlCompany;

  companyId: number;

  stockIssuance: StockIssuance;

  stockIssuanceId: number;

  stockItem: StockItem;

  stockItemId: number;

  jobCard: JobCard | null;

  jobCardId: number | null;

  session: IssuanceSession | null;

  sessionId: number | null;

  cpo: CustomerPurchaseOrder | null;

  cpoId: number | null;

  batchNumber: string;

  quantity: number;

  supplierCertificate: SupplierCertificate | null;

  supplierCertificateId: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
