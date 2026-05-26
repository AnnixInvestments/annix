import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CpoStatus, CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import {
  type CpoSearchRow,
  CustomerPurchaseOrderRepository,
} from "./customer-purchase-order.repository";

@Injectable()
export class PostgresCustomerPurchaseOrderRepository
  extends TypeOrmCrudRepository<CustomerPurchaseOrder>
  implements CustomerPurchaseOrderRepository
{
  constructor(
    @InjectRepository(CustomerPurchaseOrder)
    repository: Repository<CustomerPurchaseOrder>,
  ) {
    super(repository);
  }

  findPaginatedWithItems(
    companyId: number,
    status: string | null,
    page: number,
    limit: number,
  ): Promise<CustomerPurchaseOrder[]> {
    const where: Record<string, unknown> = { companyId };
    if (status) {
      where.status = status;
    }
    return this.repository.find({
      where,
      relations: ["items"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  findOneForCompanyWithItems(id: number, companyId: number): Promise<CustomerPurchaseOrder | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["items"],
    });
  }

  findOneByIdWithItems(id: number): Promise<CustomerPurchaseOrder | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["items"],
    });
  }

  findOneByNumberWithItems(
    cpoNumber: string,
    companyId: number,
  ): Promise<CustomerPurchaseOrder | null> {
    return this.repository.findOne({
      where: { cpoNumber, companyId },
      relations: ["items"],
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<CustomerPurchaseOrder | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findActiveByJobNumberWithItems(
    companyId: number,
    jobNumber: string,
  ): Promise<CustomerPurchaseOrder[]> {
    return this.repository.find({
      where: { companyId, jobNumber, status: CpoStatus.ACTIVE },
      relations: ["items"],
    });
  }

  findAllForCompanyWithItems(companyId: number): Promise<CustomerPurchaseOrder[]> {
    return this.repository.find({
      where: { companyId },
      relations: ["items"],
      order: { createdAt: "DESC" },
    });
  }

  async updateById(id: number, changes: DeepPartial<CustomerPurchaseOrder>): Promise<void> {
    await this.repository.update(id, changes as QueryDeepPartialEntity<CustomerPurchaseOrder>);
  }

  countByStatus(companyId: number, status: CpoStatus): Promise<number> {
    return this.repository.count({ where: { companyId, status } });
  }

  searchForCompany(companyId: number, pattern: string, limit: number): Promise<CpoSearchRow[]> {
    return this.repository
      .createQueryBuilder("cpo")
      .select([
        "cpo.id",
        "cpo.cpoNumber",
        "cpo.jobNumber",
        "cpo.jobName",
        "cpo.customerName",
        "cpo.poNumber",
        "cpo.status",
        "cpo.updatedAt",
      ])
      .where("cpo.companyId = :companyId", { companyId })
      .andWhere(
        "(cpo.cpoNumber ILIKE :pattern OR cpo.jobNumber ILIKE :pattern OR cpo.jobName ILIKE :pattern OR cpo.customerName ILIKE :pattern OR cpo.poNumber ILIKE :pattern)",
        { pattern },
      )
      .orderBy("cpo.updatedAt", "DESC")
      .take(limit)
      .getMany();
  }
}
