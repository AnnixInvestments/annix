import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Visit } from "./entities/visit.entity";
import { VisitRepository } from "./visit.repository";

@Injectable()
export class PostgresVisitRepository
  extends TypeOrmCrudRepository<Visit>
  implements VisitRepository
{
  constructor(@InjectRepository(Visit) repository: Repository<Visit>) {
    super(repository);
  }

  findAllForSalesRep(salesRepId: number): Promise<Visit[]> {
    return this.repository.find({
      where: { salesRepId },
      relations: ["prospect"],
      order: { createdAt: "DESC" },
    });
  }

  findByProspect(prospectId: number): Promise<Visit[]> {
    return this.repository.find({
      where: { prospectId },
      order: { createdAt: "DESC" },
    });
  }

  findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Visit[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledAt: Between(startDate, endDate),
      },
      relations: ["prospect"],
      order: { scheduledAt: "ASC" },
    });
  }

  findOneForSalesRep(salesRepId: number, id: number): Promise<Visit | null> {
    return this.repository.findOne({
      where: { id, salesRepId },
      relations: ["prospect"],
    });
  }

  findTodaysSchedule(salesRepId: number, dayStart: Date, dayEnd: Date): Promise<Visit[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledAt: Between(dayStart, dayEnd),
      },
      relations: ["prospect"],
      order: { scheduledAt: "ASC" },
    });
  }

  findActive(salesRepId: number, windowStart: Date, windowEnd: Date): Promise<Visit | null> {
    return this.repository.findOne({
      where: {
        salesRepId,
        startedAt: Between(windowStart, windowEnd),
        endedAt: IsNull(),
      },
      relations: ["prospect"],
    });
  }

  findBySalesRep(salesRepId: number): Promise<Visit[]> {
    return this.repository.find({ where: { salesRepId } });
  }

  findBySalesRepWithProspect(salesRepId: number): Promise<Visit[]> {
    return this.repository.find({
      where: { salesRepId },
      relations: ["prospect"],
    });
  }

  findBySalesRepStartedInRange(salesRepId: number, from: Date, to: Date): Promise<Visit[]> {
    return this.repository.find({
      where: {
        salesRepId,
        startedAt: Between(from, to),
      },
    });
  }
}
