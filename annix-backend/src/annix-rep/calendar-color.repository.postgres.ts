import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CalendarColorRepository } from "./calendar-color.repository";
import { CalendarColor, CalendarColorType } from "./entities/calendar-color.entity";

@Injectable()
export class PostgresCalendarColorRepository
  extends TypeOrmCrudRepository<CalendarColor>
  implements CalendarColorRepository
{
  constructor(@InjectRepository(CalendarColor) repository: Repository<CalendarColor>) {
    super(repository);
  }

  findByUser(userId: number): Promise<CalendarColor[]> {
    return this.repository.find({ where: { userId } });
  }

  findByUserTypeKey(
    userId: number,
    colorType: CalendarColorType,
    colorKey: string,
  ): Promise<CalendarColor | null> {
    return this.repository.findOne({
      where: { userId, colorType, colorKey },
    });
  }

  async deleteByUser(userId: number): Promise<void> {
    await this.repository.delete({ userId });
  }

  async deleteByUserAndType(userId: number, colorType: CalendarColorType): Promise<void> {
    await this.repository.delete({ userId, colorType });
  }
}
