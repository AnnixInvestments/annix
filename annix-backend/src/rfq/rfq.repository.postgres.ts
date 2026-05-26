import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Rfq } from "./entities/rfq.entity";
import { RfqPaginationParams, RfqRepository } from "./rfq.repository";

@Injectable()
export class PostgresRfqRepository extends TypeOrmCrudRepository<Rfq> implements RfqRepository {
  constructor(@InjectRepository(Rfq) repository: Repository<Rfq>) {
    super(repository);
  }

  findBySubmissionId(submissionId: string): Promise<Rfq | null> {
    return this.repository.findOne({ where: { submissionId } });
  }

  async updateById(id: number, changes: DeepPartial<Rfq>): Promise<void> {
    await this.repository.update(id, changes as QueryDeepPartialEntity<Rfq>);
  }

  findStatusesByCreator(userId: number): Promise<Rfq[]> {
    return this.repository.find({
      where: { createdBy: { id: userId } },
      select: ["id", "status"],
    });
  }

  findAllWithItemsOrdered(): Promise<Rfq[]> {
    return this.repository.find({
      relations: ["items"],
      order: { createdAt: "DESC" },
    });
  }

  findPaginatedWithItems(params: RfqPaginationParams): Promise<[Rfq[], number]> {
    const whereConditions: Record<string, unknown> = {};

    if (params.status) {
      whereConditions.status = params.status;
    }

    if (params.search) {
      const searchConditions = [
        { ...whereConditions, projectName: ILike(`%${params.search}%`) },
        { ...whereConditions, rfqNumber: ILike(`%${params.search}%`) },
      ];

      return this.repository.findAndCount({
        where: searchConditions,
        relations: ["items"],
        order: { createdAt: "DESC" },
        skip: params.skip,
        take: params.take,
      });
    }

    return this.repository.findAndCount({
      where: whereConditions,
      relations: ["items"],
      order: { createdAt: "DESC" },
      skip: params.skip,
      take: params.take,
    });
  }

  async findUpcomingNonRejected(
    today: Date,
    until: Date,
    limit: number,
    excludedStatuses: string[],
  ): Promise<Rfq[]> {
    return this.repository
      .createQueryBuilder("rfq")
      .where("rfq.requiredDate >= :today", { today })
      .andWhere("rfq.requiredDate <= :until", { until })
      .andWhere("rfq.status NOT IN (:...excludedStatuses)", { excludedStatuses })
      .orderBy("rfq.requiredDate", "ASC")
      .limit(limit)
      .getMany();
  }

  async findPumpRfqsAssignedToSupplier(supplierId: number, status?: string): Promise<Rfq[]> {
    const qb = this.repository
      .createQueryBuilder("rfq")
      .leftJoinAndSelect("rfq.items", "item")
      .leftJoinAndSelect("item.pumpDetails", "pump")
      .leftJoinAndSelect("rfq.supplierAssignments", "assignment")
      .where("assignment.supplierId = :supplierId", { supplierId })
      .andWhere("item.itemType = :itemType", { itemType: "pump" })
      .orderBy("rfq.createdAt", "DESC");

    if (status) {
      qb.andWhere("assignment.status = :status", { status });
    }

    return qb.getMany();
  }
}
