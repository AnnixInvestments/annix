import { CrudRepository } from "../lib/persistence/crud-repository";
import { Visit } from "./entities/visit.entity";

export abstract class VisitRepository extends CrudRepository<Visit> {
  abstract findAllForSalesRep(salesRepId: number): Promise<Visit[]>;
  abstract findByProspect(prospectId: number): Promise<Visit[]>;
  abstract findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Visit[]>;
  abstract findOneForSalesRep(salesRepId: number, id: number): Promise<Visit | null>;
  abstract findTodaysSchedule(salesRepId: number, dayStart: Date, dayEnd: Date): Promise<Visit[]>;
  abstract findActive(
    salesRepId: number,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<Visit | null>;
  abstract findBySalesRep(salesRepId: number): Promise<Visit[]>;
  abstract findBySalesRepWithProspect(salesRepId: number): Promise<Visit[]>;
  abstract findBySalesRepStartedInRange(salesRepId: number, from: Date, to: Date): Promise<Visit[]>;
}
