import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ConversationPage, ConversationRepository } from "./conversation.repository";
import { ConversationFilterDto } from "./dto";
import { Conversation } from "./entities/conversation.entity";

@Injectable()
export class PostgresConversationRepository
  extends TypeOrmCrudRepository<Conversation>
  implements ConversationRepository
{
  constructor(@InjectRepository(Conversation) repository: Repository<Conversation>) {
    super(repository);
  }

  async findInIds(
    ids: number[],
    filters: ConversationFilterDto,
    skip: number,
    limit: number,
  ): Promise<ConversationPage> {
    const queryBuilder = this.repository
      .createQueryBuilder("c")
      .where("c.id IN (:...ids)", { ids });

    if (filters.isArchived !== undefined) {
      queryBuilder.andWhere("c.isArchived = :isArchived", { isArchived: filters.isArchived });
    }

    if (filters.relatedEntityType) {
      queryBuilder.andWhere("c.relatedEntityType = :relatedEntityType", {
        relatedEntityType: filters.relatedEntityType,
      });
    }

    if (filters.relatedEntityId) {
      queryBuilder.andWhere("c.relatedEntityId = :relatedEntityId", {
        relatedEntityId: filters.relatedEntityId,
      });
    }

    queryBuilder.orderBy("c.lastMessageAt", "DESC", "NULLS LAST").skip(skip).take(limit);

    const [conversations, total] = await queryBuilder.getManyAndCount();
    return { conversations, total };
  }

  async findFiltered(
    filters: ConversationFilterDto,
    skip: number,
    limit: number,
  ): Promise<ConversationPage> {
    const queryBuilder = this.repository.createQueryBuilder("c");

    if (filters.isArchived !== undefined) {
      queryBuilder.andWhere("c.isArchived = :isArchived", { isArchived: filters.isArchived });
    }

    if (filters.relatedEntityType) {
      queryBuilder.andWhere("c.relatedEntityType = :relatedEntityType", {
        relatedEntityType: filters.relatedEntityType,
      });
    }

    if (filters.relatedEntityId) {
      queryBuilder.andWhere("c.relatedEntityId = :relatedEntityId", {
        relatedEntityId: filters.relatedEntityId,
      });
    }

    queryBuilder.orderBy("c.lastMessageAt", "DESC", "NULLS LAST").skip(skip).take(limit);

    const [conversations, total] = await queryBuilder.getManyAndCount();
    return { conversations, total };
  }

  async updateArchived(id: number, isArchived: boolean): Promise<void> {
    await this.repository.update(id, { isArchived });
  }
}
