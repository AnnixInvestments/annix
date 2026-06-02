import { CrudRepository } from "../../lib/persistence/crud-repository";
import { MarketingSiteContent } from "../entities/marketing-site-content.entity";

export abstract class MarketingSiteContentRepository extends CrudRepository<MarketingSiteContent> {
  abstract build(data: Partial<MarketingSiteContent>): MarketingSiteContent;
}
