import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SolutionProduct } from "../entities/solution-product.entity";
import { SolutionProductRepository } from "./solution-product.repository";

@Injectable()
export class PostgresSolutionProductRepository
  extends TypeOrmCrudRepository<SolutionProduct>
  implements SolutionProductRepository
{
  constructor(@InjectRepository(SolutionProduct) repository: Repository<SolutionProduct>) {
    super(repository);
  }

  build(data: DeepPartial<SolutionProduct>): SolutionProduct {
    return this.repository.create(data as TypeOrmDeepPartial<SolutionProduct>);
  }

  findByProductId(productId: number): Promise<SolutionProduct | null> {
    return this.repository.findOne({ where: { productId } });
  }
}
