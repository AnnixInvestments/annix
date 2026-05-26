import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberProduct } from "../entities/rubber-product.entity";
import { RubberProductRepository } from "./rubber-product.repository";

@Injectable()
export class PostgresRubberProductRepository
  extends TypeOrmCrudRepository<RubberProduct>
  implements RubberProductRepository
{
  constructor(@InjectRepository(RubberProduct) repository: Repository<RubberProduct>) {
    super(repository);
  }

  build(data: Partial<RubberProduct>): RubberProduct {
    return this.repository.create(data as TypeOrmDeepPartial<RubberProduct>);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  findAllOrderedByTitle(): Promise<RubberProduct[]> {
    return this.repository.find({ order: { title: "ASC" } });
  }

  findOneByCompoundFirebaseUid(compoundFirebaseUid: string): Promise<RubberProduct | null> {
    return this.repository.findOne({ where: { compoundFirebaseUid } });
  }
}
