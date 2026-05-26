import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  type FindOptionsWhere,
  type QueryDeepPartialEntity,
  Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ProductDatasheet, type ProductDatasheetType } from "../entities/product-datasheet.entity";
import {
  type DatasheetOwnerField,
  ProductDatasheetRepository,
} from "./product-datasheet.repository";

@Injectable()
export class PostgresProductDatasheetRepository
  extends TypeOrmCrudRepository<ProductDatasheet>
  implements ProductDatasheetRepository
{
  constructor(@InjectRepository(ProductDatasheet) repository: Repository<ProductDatasheet>) {
    super(repository);
  }

  build(data: DeepPartial<ProductDatasheet>): ProductDatasheet {
    return this.repository.create(data as TypeOrmDeepPartial<ProductDatasheet>);
  }

  findActiveByOwner(
    companyId: number,
    ownerField: DatasheetOwnerField,
    ownerId: number,
  ): Promise<ProductDatasheet[]> {
    const where: FindOptionsWhere<ProductDatasheet> = { companyId, isActive: true };
    where[ownerField] = ownerId;
    return this.repository.find({ where });
  }

  findActiveForCompany(
    companyId: number,
    productType: ProductDatasheetType | undefined,
  ): Promise<ProductDatasheet[]> {
    const where: FindOptionsWhere<ProductDatasheet> = { companyId, isActive: true };
    if (productType) {
      where.productType = productType;
    }
    return this.repository.find({
      where,
      order: { uploadedAt: "DESC" },
    });
  }

  findOneForCompany(companyId: number, id: number): Promise<ProductDatasheet | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByIdOrFail(id: number): Promise<ProductDatasheet> {
    return this.repository.findOneOrFail({ where: { id } });
  }

  async updateActiveFlagForIds(ids: number[], isActive: boolean): Promise<void> {
    await this.repository.update(ids, { isActive });
  }

  async updateById(id: number, patch: DeepPartial<ProductDatasheet>): Promise<void> {
    await this.repository.update(id, patch as QueryDeepPartialEntity<ProductDatasheet>);
  }
}
