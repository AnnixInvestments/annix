import { CrudRepository } from "../../lib/persistence/crud-repository";
import { PromoCode } from "../entities/promo-code.entity";

export abstract class PromoCodeRepository extends CrudRepository<PromoCode> {
  abstract allOrderedByCreatedAt(): Promise<PromoCode[]>;
  abstract findByCode(code: string): Promise<PromoCode | null>;
  abstract deleteById(id: number): Promise<number>;
  abstract incrementRedemptionWhenAvailable(promoCodeId: number): Promise<number>;
}
