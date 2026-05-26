import { CrudRepository } from "../lib/persistence/crud-repository";
import { CalendarColor, CalendarColorType } from "./entities/calendar-color.entity";

export abstract class CalendarColorRepository extends CrudRepository<CalendarColor> {
  abstract findByUser(userId: number): Promise<CalendarColor[]>;
  abstract findByUserTypeKey(
    userId: number,
    colorType: CalendarColorType,
    colorKey: string,
  ): Promise<CalendarColor | null>;
  abstract deleteByUser(userId: number): Promise<void>;
  abstract deleteByUserAndType(userId: number, colorType: CalendarColorType): Promise<void>;
}
