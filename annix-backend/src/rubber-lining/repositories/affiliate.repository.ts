import { CrudRepository } from "../../lib/persistence/crud-repository";
import { Affiliate } from "../entities/affiliate.entity";

export abstract class AffiliateRepository extends CrudRepository<Affiliate> {
  abstract build(data: Partial<Affiliate>): Affiliate;
  abstract findByCompanyId(companyId: number): Promise<Affiliate[]>;
}
