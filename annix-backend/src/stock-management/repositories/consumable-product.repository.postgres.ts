import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ConsumableProduct } from "../entities/consumable-product.entity";
import { ConsumableProductRepository } from "./consumable-product.repository";

@Injectable()
export class PostgresConsumableProductRepository
  extends TypeOrmCrudRepository<ConsumableProduct>
  implements ConsumableProductRepository
{
  constructor(@InjectRepository(ConsumableProduct) repository: Repository<ConsumableProduct>) {
    super(repository);
  }

  build(data: DeepPartial<ConsumableProduct>): ConsumableProduct {
    return this.repository.create(data as TypeOrmDeepPartial<ConsumableProduct>);
  }

  findByProductId(productId: number): Promise<ConsumableProduct | null> {
    return this.repository.findOne({ where: { productId } });
  }
}
