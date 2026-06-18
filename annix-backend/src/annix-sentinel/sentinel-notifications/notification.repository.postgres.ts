import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelNotification } from "./entities/notification.entity";
import { AnnixSentinelNotificationRepository } from "./notification.repository";

@Injectable()
export class PostgresAnnixSentinelNotificationRepository
  extends TypeOrmCrudRepository<AnnixSentinelNotification>
  implements AnnixSentinelNotificationRepository
{
  constructor(
    @InjectRepository(AnnixSentinelNotification)
    repository: Repository<AnnixSentinelNotification>,
  ) {
    super(repository);
  }

  findUnreadForUser(userId: number): Promise<AnnixSentinelNotification[]> {
    return this.repository.find({
      where: { userId, readAt: IsNull() },
      order: { sentAt: "DESC" },
    });
  }
}
