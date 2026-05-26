import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PaintProduct } from "../entities/paint-product.entity";
import { PaintProductRepository } from "./paint-product.repository";

@Injectable()
export class PostgresPaintProductRepository
  extends TypeOrmCrudRepository<PaintProduct>
  implements PaintProductRepository
{
  constructor(@InjectRepository(PaintProduct) repository: Repository<PaintProduct>) {
    super(repository);
  }

  build(data: DeepPartial<PaintProduct>): PaintProduct {
    return this.repository.create(data as TypeOrmDeepPartial<PaintProduct>);
  }

  findByProductId(productId: number): Promise<PaintProduct | null> {
    return this.repository.findOne({ where: { productId } });
  }
}
