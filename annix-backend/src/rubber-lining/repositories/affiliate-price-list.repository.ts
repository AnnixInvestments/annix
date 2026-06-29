import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AffiliatePriceList } from "../entities/affiliate-price-list.entity";

export abstract class AffiliatePriceListRepository extends CrudRepository<AffiliatePriceList> {
  abstract build(data: Partial<AffiliatePriceList>): AffiliatePriceList;
  abstract findByAffiliateId(affiliateId: number): Promise<AffiliatePriceList[]>;
}
