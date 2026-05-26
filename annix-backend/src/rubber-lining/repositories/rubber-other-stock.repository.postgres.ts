import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberOtherStock } from "../entities/rubber-other-stock.entity";
import { RubberOtherStockRepository } from "./rubber-other-stock.repository";

@Injectable()
export class PostgresRubberOtherStockRepository
  extends TypeOrmCrudRepository<RubberOtherStock>
  implements RubberOtherStockRepository
{
  constructor(@InjectRepository(RubberOtherStock) repository: Repository<RubberOtherStock>) {
    super(repository);
  }

  build(data: Partial<RubberOtherStock>): RubberOtherStock {
    return this.repository.create(data as TypeOrmDeepPartial<RubberOtherStock>);
  }

  findAllWithLocation(includeInactive: boolean): Promise<RubberOtherStock[]> {
    const query = this.repository
      .createQueryBuilder("stock")
      .leftJoinAndSelect("stock.stockLocation", "location")
      .orderBy("stock.item_name", "ASC");

    if (!includeInactive) {
      query.where("stock.is_active = :isActive", { isActive: true });
    }

    return query.getMany();
  }

  findLowStockWithLocation(): Promise<RubberOtherStock[]> {
    return this.repository
      .createQueryBuilder("stock")
      .leftJoinAndSelect("stock.stockLocation", "location")
      .where("stock.is_active = :isActive", { isActive: true })
      .andWhere("stock.quantity <= stock.reorder_point")
      .orderBy("stock.item_name", "ASC")
      .getMany();
  }

  findByIdWithLocation(id: number): Promise<RubberOtherStock | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["stockLocation"],
    });
  }

  findOneByItemCode(itemCode: string): Promise<RubberOtherStock | null> {
    return this.repository.findOne({ where: { itemCode } });
  }
}
