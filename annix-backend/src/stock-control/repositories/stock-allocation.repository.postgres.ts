import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { type CostByJobRow, StockAllocationRepository } from "./stock-allocation.repository";

@Injectable()
export class PostgresStockAllocationRepository
  extends TypeOrmCrudRepository<StockAllocation>
  implements StockAllocationRepository
{
  constructor(@InjectRepository(StockAllocation) repository: Repository<StockAllocation>) {
    super(repository);
  }

  findActiveExistingByJobAndStockItem(
    companyId: number,
    jobCardId: number,
    stockItemId: number,
  ): Promise<StockAllocation[]> {
    return this.repository.find({
      where: {
        jobCard: { id: jobCardId },
        stockItem: { id: stockItemId },
        companyId,
        pendingApproval: false,
        rejectedAt: IsNull(),
      },
    });
  }

  findPendingForCompany(companyId: number): Promise<StockAllocation[]> {
    return this.repository.find({
      where: { companyId, pendingApproval: true },
      relations: ["stockItem", "jobCard"],
      order: { createdAt: "DESC" },
    });
  }

  findForJobCardWithRelations(companyId: number, jobCardId: number): Promise<StockAllocation[]> {
    return this.repository.find({
      where: { jobCard: { id: jobCardId }, companyId },
      relations: ["stockItem", "stockItem.sourceJobCard"],
      order: { createdAt: "ASC" },
    });
  }

  findForJobCardPaginated(
    companyId: number,
    jobCardId: number,
    page: number,
    limit: number,
  ): Promise<[StockAllocation[], number]> {
    return this.repository.findAndCount({
      where: { jobCard: { id: jobCardId }, companyId },
      relations: ["stockItem", "staffMember"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findOnePendingForCompany(id: number, companyId: number): Promise<StockAllocation | null> {
    return this.repository.findOne({
      where: { id, companyId, pendingApproval: true },
    });
  }

  findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<StockAllocation | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations,
    });
  }

  findOneByJobAndStockItem(
    jobCardId: number,
    stockItemId: number,
  ): Promise<StockAllocation | null> {
    return this.repository.findOne({
      where: { jobCard: { id: jobCardId }, stockItem: { id: stockItemId } },
      relations: ["stockItem"],
    });
  }

  findForJobCardWithStockItem(companyId: number, jobCardId: number): Promise<StockAllocation[]> {
    return this.repository.find({
      where: { jobCard: { id: jobCardId }, companyId },
      relations: ["stockItem"],
    });
  }

  findPendingByIdsForJobCard(
    ids: number[],
    jobCardId: number,
    companyId: number,
  ): Promise<StockAllocation[]> {
    return this.repository.find({
      where: ids.map((id) => ({
        id,
        jobCardId,
        companyId,
        undone: false,
        issuedAt: IsNull(),
      })),
    });
  }

  findActiveByIdForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<StockAllocation | null> {
    return this.repository.findOne({
      where: { id, jobCardId, companyId, undone: false },
      relations: ["stockItem"],
    });
  }

  findActiveUnissuedByIdForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<StockAllocation | null> {
    return this.repository.findOne({
      where: { id, jobCardId, companyId, undone: false, issuedAt: IsNull() },
    });
  }

  saveMany(entities: StockAllocation[]): Promise<StockAllocation[]> {
    return this.repository.save(entities);
  }

  async costByJob(companyId: number): Promise<CostByJobRow[]> {
    const result = await this.repository
      .createQueryBuilder("a")
      .innerJoin("a.jobCard", "j")
      .innerJoin("a.stockItem", "i")
      .select("j.id", "jobCardId")
      .addSelect("j.job_number", "jobNumber")
      .addSelect("j.job_name", "jobName")
      .addSelect("j.customer_name", "customerName")
      .addSelect("SUM(a.quantity_used * i.cost_per_unit)", "totalCost")
      .addSelect("SUM(a.quantity_used)", "totalItemsAllocated")
      .where("a.company_id = :companyId", { companyId })
      .groupBy("j.id")
      .addGroupBy("j.job_number")
      .addGroupBy("j.job_name")
      .addGroupBy("j.customer_name")
      .orderBy('"totalCost"', "DESC")
      .getRawMany();

    return result.map((r) => ({
      jobCardId: Number(r.jobCardId),
      jobNumber: r.jobNumber,
      jobName: r.jobName,
      customerName: r.customerName,
      totalCost: Number(r.totalCost || 0),
      totalItemsAllocated: Number(r.totalItemsAllocated || 0),
    }));
  }
}
