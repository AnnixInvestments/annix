import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  RequisitionSourceType,
  RequisitionStatus,
  RubberPurchaseRequisition,
} from "../entities/rubber-purchase-requisition.entity";
import {
  type RequisitionListFilters,
  RubberPurchaseRequisitionRepository,
} from "./rubber-purchase-requisition.repository";

@Injectable()
export class PostgresRubberPurchaseRequisitionRepository
  extends TypeOrmCrudRepository<RubberPurchaseRequisition>
  implements RubberPurchaseRequisitionRepository
{
  constructor(
    @InjectRepository(RubberPurchaseRequisition)
    repository: Repository<RubberPurchaseRequisition>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberPurchaseRequisition>): RubberPurchaseRequisition {
    return this.repository.create(data as TypeOrmDeepPartial<RubberPurchaseRequisition>);
  }

  findFilteredWithRelations(
    filters?: RequisitionListFilters,
  ): Promise<RubberPurchaseRequisition[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("req")
      .leftJoinAndSelect("req.supplierCompany", "supplier")
      .leftJoinAndSelect("req.items", "items")
      .orderBy("req.createdAt", "DESC");

    if (filters?.status) {
      queryBuilder.andWhere("req.status = :status", { status: filters.status });
    }
    if (filters?.sourceType) {
      queryBuilder.andWhere("req.sourceType = :sourceType", {
        sourceType: filters.sourceType,
      });
    }

    return queryBuilder.getMany();
  }

  findOneByIdWithRelations(id: number): Promise<RubberPurchaseRequisition | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["supplierCompany", "items"],
    });
  }

  findOneByIdWithItems(id: number): Promise<RubberPurchaseRequisition | null> {
    return this.repository.findOne({ where: { id }, relations: ["items"] });
  }

  findOnePendingLowStockWithItems(): Promise<RubberPurchaseRequisition | null> {
    return this.repository.findOne({
      where: {
        sourceType: RequisitionSourceType.LOW_STOCK,
        status: RequisitionStatus.PENDING,
      },
      relations: ["items"],
    });
  }

  findPendingWithRelations(): Promise<RubberPurchaseRequisition[]> {
    return this.repository.find({
      where: { status: RequisitionStatus.PENDING },
      relations: ["supplierCompany", "items"],
      order: { createdAt: "ASC" },
    });
  }
}
