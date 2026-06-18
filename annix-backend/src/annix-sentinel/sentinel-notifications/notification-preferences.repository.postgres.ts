import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelNotificationPreferences } from "./entities/notification-preferences.entity";
import { AnnixSentinelNotificationPreferencesRepository } from "./notification-preferences.repository";

@Injectable()
export class PostgresAnnixSentinelNotificationPreferencesRepository
  extends TypeOrmCrudRepository<AnnixSentinelNotificationPreferences>
  implements AnnixSentinelNotificationPreferencesRepository
{
  constructor(
    @InjectRepository(AnnixSentinelNotificationPreferences)
    repository: Repository<AnnixSentinelNotificationPreferences>,
  ) {
    super(repository);
  }

  findByUserIds(userIds: number[]): Promise<AnnixSentinelNotificationPreferences[]> {
    return this.repository.find({ where: { userId: In(userIds) } });
  }

  findOneByUserId(userId: number): Promise<AnnixSentinelNotificationPreferences | null> {
    return this.repository.findOne({ where: { userId } });
  }
}
