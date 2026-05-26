import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { DeliveryNoteItemRepository } from "./delivery-note-item.repository";

@Injectable()
export class PostgresDeliveryNoteItemRepository
  extends TypeOrmCrudRepository<DeliveryNoteItem>
  implements DeliveryNoteItemRepository
{
  constructor(@InjectRepository(DeliveryNoteItem) repository: Repository<DeliveryNoteItem>) {
    super(repository);
  }

  createMany(rows: Array<DeepPartial<DeliveryNoteItem>>): Promise<DeliveryNoteItem[]> {
    const entities = rows.map((row) => this.repository.create(row));
    return this.repository.save(entities);
  }

  async supplierNamesForStockItems(
    companyId: number,
    itemIds: number[],
  ): Promise<Array<{ stockItemId: number; supplierName: string }>> {
    const supplierRows: { stockItemId: number; supplierName: string }[] = await this.repository
      .createQueryBuilder("dni")
      .innerJoin("dni.deliveryNote", "dn")
      .where("dni.stock_item_id IN (:...itemIds)", { itemIds })
      .andWhere("dni.company_id = :companyId", { companyId })
      .select("DISTINCT dni.stock_item_id", "stockItemId")
      .addSelect("dn.supplierName", "supplierName")
      .getRawMany();
    return supplierRows;
  }
}
