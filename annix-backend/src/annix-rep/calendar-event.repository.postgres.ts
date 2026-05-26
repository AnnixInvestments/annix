import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CalendarEventRepository } from "./calendar-event.repository";
import { CalendarEvent } from "./entities/calendar-event.entity";

@Injectable()
export class PostgresCalendarEventRepository
  extends TypeOrmCrudRepository<CalendarEvent>
  implements CalendarEventRepository
{
  constructor(@InjectRepository(CalendarEvent) repository: Repository<CalendarEvent>) {
    super(repository);
  }

  findOverlapsForUser(userId: number, today: Date, futureDate: Date): Promise<CalendarEvent[]> {
    return this.repository.find({
      where: {
        connection: { userId },
        startTime: MoreThanOrEqual(today),
        endTime: LessThanOrEqual(futureDate),
      },
      relations: ["connection"],
      order: { startTime: "ASC" },
    });
  }

  findInRangeForConnections(
    connectionIds: number[],
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    return this.repository
      .createQueryBuilder("event")
      .where("event.connection_id IN (:...connectionIds)", { connectionIds })
      .andWhere("event.start_time >= :startDate", { startDate })
      .andWhere("event.end_time <= :endDate", { endDate })
      .orderBy("event.start_time", "ASC")
      .getMany();
  }

  findByConnectionAndExternalId(
    connectionId: number,
    externalId: string,
  ): Promise<CalendarEvent | null> {
    return this.repository.findOne({
      where: { connectionId, externalId },
    });
  }

  async deleteByConnection(connectionId: number): Promise<void> {
    await this.repository.delete({ connectionId });
  }

  async deleteByConnectionAndExternalId(connectionId: number, externalId: string): Promise<void> {
    await this.repository.delete({ connectionId, externalId });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete({ id });
  }

  findWithConnection(id: number): Promise<CalendarEvent | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["connection"],
    });
  }
}
