import { CrudRepository } from "../lib/persistence/crud-repository";
import { ConversationFilterDto } from "./dto";
import { Conversation } from "./entities/conversation.entity";

export interface ConversationPage {
  conversations: Conversation[];
  total: number;
}

export abstract class ConversationRepository extends CrudRepository<Conversation> {
  abstract findInIds(
    ids: number[],
    filters: ConversationFilterDto,
    skip: number,
    limit: number,
  ): Promise<ConversationPage>;
  abstract findFiltered(
    filters: ConversationFilterDto,
    skip: number,
    limit: number,
  ): Promise<ConversationPage>;
  abstract updateArchived(id: number, isArchived: boolean): Promise<void>;
}
