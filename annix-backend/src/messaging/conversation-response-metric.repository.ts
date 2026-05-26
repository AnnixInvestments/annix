import { CrudRepository } from "../lib/persistence/crud-repository";
import { MetricsFilterDto } from "./dto";
import { ConversationResponseMetric } from "./entities/conversation-response-metric.entity";

export abstract class ConversationResponseMetricRepository extends CrudRepository<ConversationResponseMetric> {
  abstract findByResponder(
    userId: number,
    filters?: MetricsFilterDto,
  ): Promise<ConversationResponseMetric[]>;
  abstract findFiltered(filters?: MetricsFilterDto): Promise<ConversationResponseMetric[]>;
  abstract existsByMessageAndResponder(messageId: number, responderId: number): Promise<boolean>;
}
