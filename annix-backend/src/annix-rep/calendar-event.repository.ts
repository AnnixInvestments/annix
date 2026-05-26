import { CrudRepository } from "../lib/persistence/crud-repository";
import { CalendarEvent } from "./entities/calendar-event.entity";

export abstract class CalendarEventRepository extends CrudRepository<CalendarEvent> {
  abstract findOverlapsForUser(
    userId: number,
    today: Date,
    futureDate: Date,
  ): Promise<CalendarEvent[]>;
  abstract findInRangeForConnections(
    connectionIds: number[],
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]>;
  abstract findByConnectionAndExternalId(
    connectionId: number,
    externalId: string,
  ): Promise<CalendarEvent | null>;
  abstract deleteByConnection(connectionId: number): Promise<void>;
  abstract deleteByConnectionAndExternalId(connectionId: number, externalId: string): Promise<void>;
  abstract deleteById(id: number): Promise<void>;
  abstract findWithConnection(id: number): Promise<CalendarEvent | null>;
}
