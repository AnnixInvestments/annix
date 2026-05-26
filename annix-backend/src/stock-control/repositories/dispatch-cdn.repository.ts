import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { DispatchCdn } from "../entities/dispatch-cdn.entity";

export abstract class DispatchCdnRepository extends CrudRepository<DispatchCdn> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<DispatchCdn[]>;
  abstract findOneForCompany(cdnId: number, companyId: number): Promise<DispatchCdn | null>;
  abstract updateById(cdnId: number, changes: DeepPartial<DispatchCdn>): Promise<void>;
}
