import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CalendarConnectionRepository } from "./calendar-connection.repository";
import { CalendarConnection, CalendarSyncStatus } from "./entities/calendar-connection.entity";
import { CalendarProvider } from "./entities/calendar-event.entity";

@Injectable()
export class PostgresCalendarConnectionRepository
  extends TypeOrmCrudRepository<CalendarConnection>
  implements CalendarConnectionRepository
{
  constructor(@InjectRepository(CalendarConnection) repository: Repository<CalendarConnection>) {
    super(repository);
  }

  findBySyncStatuses(statuses: CalendarSyncStatus[]): Promise<CalendarConnection[]> {
    return this.repository.find({
      where: { syncStatus: In(statuses) },
    });
  }

  findByUser(userId: number): Promise<CalendarConnection[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  findByIdAndUser(id: number, userId: number): Promise<CalendarConnection | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  findByUserProviderEmail(
    userId: number,
    provider: CalendarProvider,
    accountEmail: string,
  ): Promise<CalendarConnection | null> {
    return this.repository.findOne({
      where: { userId, provider, accountEmail },
    });
  }

  findActiveByUser(userId: number): Promise<CalendarConnection[]> {
    return this.repository.find({
      where: { userId, syncStatus: CalendarSyncStatus.ACTIVE },
    });
  }

  async clearPrimaryForUser(userId: number): Promise<void> {
    await this.repository.update({ userId }, { isPrimary: false });
  }
}
