import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { CustomerPurchaseOrderItemRepository } from "./customer-purchase-order-item.repository";

@Injectable()
export class PostgresCustomerPurchaseOrderItemRepository
  extends TypeOrmCrudRepository<CustomerPurchaseOrderItem>
  implements CustomerPurchaseOrderItemRepository
{
  constructor(
    @InjectRepository(CustomerPurchaseOrderItem)
    repository: Repository<CustomerPurchaseOrderItem>,
  ) {
    super(repository);
  }

  createMany(
    rows: Array<DeepPartial<CustomerPurchaseOrderItem>>,
  ): Promise<CustomerPurchaseOrderItem[]> {
    const entities = rows.map((row) => this.repository.create(row));
    return this.repository.save(entities);
  }

  findOneForCpoAndCompany(
    id: number,
    cpoId: number,
    companyId: number,
  ): Promise<CustomerPurchaseOrderItem | null> {
    return this.repository.findOne({
      where: { id, cpoId, companyId },
    });
  }

  findOneForCpo(id: number, cpoId: number): Promise<CustomerPurchaseOrderItem | null> {
    return this.repository.findOne({
      where: { id, cpoId },
    });
  }

  findForCpoOrdered(cpoId: number, companyId: number): Promise<CustomerPurchaseOrderItem[]> {
    return this.repository.find({
      where: { cpoId, companyId },
      order: { sortOrder: "ASC" },
    });
  }

  async updateById(id: number, changes: DeepPartial<CustomerPurchaseOrderItem>): Promise<void> {
    await this.repository.update(id, changes as QueryDeepPartialEntity<CustomerPurchaseOrderItem>);
  }

  async deleteForCpo(cpoId: number): Promise<void> {
    await this.repository.delete({ cpoId });
  }
}
