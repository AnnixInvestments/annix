import { CrudRepository } from "../../lib/persistence/crud-repository";
import { DispatchScan } from "../entities/dispatch-scan.entity";

export abstract class DispatchScanRepository extends CrudRepository<DispatchScan> {
  abstract findForJobCardItem(jobCardId: number, stockItemId: number): Promise<DispatchScan[]>;
  abstract findForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]>;
  abstract findHistoryForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]>;
  abstract findOneForCompanyWithJobCard(
    scanId: number,
    companyId: number,
  ): Promise<DispatchScan | null>;
}
