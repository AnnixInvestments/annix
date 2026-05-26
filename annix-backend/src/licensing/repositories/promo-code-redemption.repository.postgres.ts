import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PromoCodeRedemption } from "../entities/promo-code-redemption.entity";
import { PromoCodeRedemptionRepository } from "./promo-code-redemption.repository";

@Injectable()
export class PostgresPromoCodeRedemptionRepository
  extends TypeOrmCrudRepository<PromoCodeRedemption>
  implements PromoCodeRedemptionRepository
{
  constructor(@InjectRepository(PromoCodeRedemption) repository: Repository<PromoCodeRedemption>) {
    super(repository);
  }

  forPromoCode(promoCodeId: number): Promise<PromoCodeRedemption[]> {
    return this.repository.find({ where: { promoCodeId }, order: { redeemedAt: "DESC" } });
  }

  findByPromoAndCompany(
    promoCodeId: number,
    companyId: number,
  ): Promise<PromoCodeRedemption | null> {
    return this.repository.findOne({ where: { promoCodeId, companyId } });
  }
}
