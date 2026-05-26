import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../lib/datetime";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ConversationResponseMetricRepository } from "./conversation-response-metric.repository";
import { MetricsFilterDto } from "./dto";
import { ConversationResponseMetric } from "./entities/conversation-response-metric.entity";

@Injectable()
export class PostgresConversationResponseMetricRepository
  extends TypeOrmCrudRepository<ConversationResponseMetric>
  implements ConversationResponseMetricRepository
{
  constructor(
    @InjectRepository(ConversationResponseMetric)
    repository: Repository<ConversationResponseMetric>,
  ) {
    super(repository);
  }

  async findByResponder(
    userId: number,
    filters?: MetricsFilterDto,
  ): Promise<ConversationResponseMetric[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("m")
      .where("m.responderId = :userId", { userId });

    if (filters?.startDate) {
      queryBuilder.andWhere("m.createdAt >= :startDate", {
        startDate: fromISO(filters.startDate).toJSDate(),
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere("m.createdAt <= :endDate", {
        endDate: fromISO(filters.endDate).toJSDate(),
      });
    }

    return queryBuilder.getMany();
  }

  async findFiltered(filters?: MetricsFilterDto): Promise<ConversationResponseMetric[]> {
    const queryBuilder = this.repository.createQueryBuilder("m");

    if (filters?.startDate) {
      queryBuilder.andWhere("m.createdAt >= :startDate", {
        startDate: fromISO(filters.startDate).toJSDate(),
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere("m.createdAt <= :endDate", {
        endDate: fromISO(filters.endDate).toJSDate(),
      });
    }

    if (filters?.userId) {
      queryBuilder.andWhere("m.responderId = :userId", { userId: filters.userId });
    }

    return queryBuilder.getMany();
  }

  async existsByMessageAndResponder(messageId: number, responderId: number): Promise<boolean> {
    const count = await this.repository.count({ where: { messageId, responderId } });
    return count > 0;
  }
}
