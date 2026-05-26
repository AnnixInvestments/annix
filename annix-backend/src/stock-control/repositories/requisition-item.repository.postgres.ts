import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RequisitionItem } from "../entities/requisition-item.entity";
import { RequisitionItemRepository } from "./requisition-item.repository";

@Injectable()
export class PostgresRequisitionItemRepository
  extends TypeOrmCrudRepository<RequisitionItem>
  implements RequisitionItemRepository
{
  constructor(@InjectRepository(RequisitionItem) repository: Repository<RequisitionItem>) {
    super(repository);
  }

  findOneForCompanyWithStockItem(id: number, companyId: number): Promise<RequisitionItem | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["stockItem"],
    });
  }

  findOneForRequisition(
    id: number,
    requisitionId: number,
    companyId: number,
  ): Promise<RequisitionItem | null> {
    return this.repository.findOne({
      where: { id, requisitionId, companyId },
    });
  }

  buildMany(rows: DeepPartial<RequisitionItem>[]): RequisitionItem[] {
    return this.repository.create(rows as TypeOrmDeepPartial<RequisitionItem>[]);
  }

  saveMany(entities: RequisitionItem[]): Promise<RequisitionItem[]> {
    return this.repository.save(entities);
  }
}
