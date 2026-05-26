import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Equal, Like, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { Requisition, RequisitionSource, RequisitionStatus } from "../entities/requisition.entity";
import { RequisitionRepository } from "./requisition.repository";

@Injectable()
export class PostgresRequisitionRepository
  extends TypeOrmCrudRepository<Requisition>
  implements RequisitionRepository
{
  constructor(@InjectRepository(Requisition) repository: Repository<Requisition>) {
    super(repository);
  }

  findActiveForJobCard(companyId: number, jobCardId: number): Promise<Requisition | null> {
    return this.repository.findOne({
      where: {
        jobCardId,
        companyId,
        status: Not(Equal(RequisitionStatus.CANCELLED)),
      },
    });
  }

  findActiveForJobCardWithItems(companyId: number, jobCardId: number): Promise<Requisition | null> {
    return this.repository.findOne({
      where: {
        jobCardId,
        companyId,
        status: Not(Equal(RequisitionStatus.CANCELLED)),
      },
      relations: ["items"],
    });
  }

  findAllForCompanyPaginated(
    companyId: number,
    page: number,
    limit: number,
  ): Promise<Requisition[]> {
    return this.repository.find({
      where: { companyId },
      relations: ["jobCard", "items"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  findOneForCompanyWithDetails(id: number, companyId: number): Promise<Requisition | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["jobCard", "items", "items.stockItem"],
    });
  }

  findOneForCompanyWithItems(id: number, companyId: number): Promise<Requisition | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["items"],
    });
  }

  findByExactNumber(companyId: number, requisitionNumber: string): Promise<Requisition | null> {
    return this.repository.findOne({
      where: { companyId, requisitionNumber },
    });
  }

  countByNumberPrefix(companyId: number, prefix: string): Promise<number> {
    return this.repository.count({
      where: { companyId, requisitionNumber: Like(`${prefix}%`) },
    });
  }

  findActiveReorderByNumber(
    companyId: number,
    requisitionNumber: string,
    source: RequisitionSource,
  ): Promise<Requisition | null> {
    return this.repository.findOne({
      where: {
        requisitionNumber,
        companyId,
        source,
        status: Not(Equal(RequisitionStatus.CANCELLED)),
      },
    });
  }

  findForCpo(cpoId: number, companyId: number): Promise<Requisition | null> {
    return this.repository.findOne({
      where: { cpoId, companyId },
    });
  }

  findCalloffForCpo(cpoId: number, companyId: number): Promise<Requisition | null> {
    return this.repository.findOne({
      where: { cpoId, companyId, isCalloffOrder: true },
    });
  }
}
