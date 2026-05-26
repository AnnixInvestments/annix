import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PromoCode } from "../entities/promo-code.entity";
import { PromoCodeRepository } from "./promo-code.repository";

@Injectable()
export class PostgresPromoCodeRepository
  extends TypeOrmCrudRepository<PromoCode>
  implements PromoCodeRepository
{
  constructor(@InjectRepository(PromoCode) repository: Repository<PromoCode>) {
    super(repository);
  }

  allOrderedByCreatedAt(): Promise<PromoCode[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }

  findByCode(code: string): Promise<PromoCode | null> {
    return this.repository.findOne({ where: { code } });
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.repository.delete({ id });
    return result.affected ?? 0;
  }

  async incrementRedemptionWhenAvailable(promoCodeId: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(PromoCode)
      .set({ timesRedeemed: () => "times_redeemed + 1" })
      .where("id = :id", { id: promoCodeId })
      .andWhere("(max_redemptions IS NULL OR times_redeemed < max_redemptions)")
      .execute();
    return result.affected ?? 0;
  }
}
