import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  BoqSupplierAccessRepository,
  BoqSupplierStatusCount,
} from "./boq-supplier-access.repository";
import { BoqSupplierAccess, SupplierBoqStatus } from "./entities/boq-supplier-access.entity";

@Injectable()
export class PostgresBoqSupplierAccessRepository
  extends TypeOrmCrudRepository<BoqSupplierAccess>
  implements BoqSupplierAccessRepository
{
  constructor(@InjectRepository(BoqSupplierAccess) repository: Repository<BoqSupplierAccess>) {
    super(repository);
  }

  async deleteByBoqId(boqId: number): Promise<void> {
    await this.repository.delete({ boqId });
  }

  countDistinctSuppliersByStatusForBoqs(boqIds: number[]): Promise<BoqSupplierStatusCount[]> {
    return this.repository
      .createQueryBuilder("access")
      .select("access.boq_id", "boqId")
      .addSelect("access.status", "status")
      .addSelect("COUNT(DISTINCT access.supplier_profile_id)", "count")
      .where("access.boq_id IN (:...boqIds)", { boqIds })
      .groupBy("access.boq_id")
      .addGroupBy("access.status")
      .getRawMany<BoqSupplierStatusCount>();
  }

  findByBoqAndSupplier(
    boqId: number,
    supplierProfileId: number,
  ): Promise<BoqSupplierAccess | null> {
    return this.repository.findOne({ where: { boqId, supplierProfileId } });
  }

  findBySupplier(
    supplierProfileId: number,
    status?: SupplierBoqStatus,
  ): Promise<BoqSupplierAccess[]> {
    const where: Record<string, unknown> = { supplierProfileId };
    if (status) where.status = status;
    return this.repository.find({
      where,
      relations: ["boq"],
      order: { createdAt: "DESC" },
    });
  }

  findByBoqId(boqId: number): Promise<BoqSupplierAccess[]> {
    return this.repository.find({ where: { boqId } });
  }

  findBySupplierAndStatuses(
    supplierProfileId: number,
    statuses: SupplierBoqStatus[],
  ): Promise<BoqSupplierAccess[]> {
    return this.repository.find({
      where: {
        supplierProfileId,
        status: In(statuses),
      },
    });
  }

  findByBoqIdsExcludingStatus(
    boqIds: number[],
    excludedStatus: SupplierBoqStatus,
  ): Promise<BoqSupplierAccess[]> {
    return this.repository.find({
      where: {
        boqId: In(boqIds),
        status: Not(excludedStatus),
      },
    });
  }
}
