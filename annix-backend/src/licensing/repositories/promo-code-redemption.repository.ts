import { CrudRepository } from "../../lib/persistence/crud-repository";
import { PromoCodeRedemption } from "../entities/promo-code-redemption.entity";

export abstract class PromoCodeRedemptionRepository extends CrudRepository<PromoCodeRedemption> {
  abstract forPromoCode(promoCodeId: number): Promise<PromoCodeRedemption[]>;
  abstract findByPromoAndCompany(
    promoCodeId: number,
    companyId: number,
  ): Promise<PromoCodeRedemption | null>;
}
