import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ChatConversation } from "../entities/chat-conversation.entity";
import { ChatConversationRepository } from "./chat-conversation.repository";

@Injectable()
export class PostgresChatConversationRepository
  extends TypeOrmCrudRepository<ChatConversation>
  implements ChatConversationRepository
{
  constructor(@InjectRepository(ChatConversation) repository: Repository<ChatConversation>) {
    super(repository);
  }

  async touchLastMessageAt(conversationId: number, lastMessageAt: Date): Promise<void> {
    await this.repository.update(conversationId, { lastMessageAt });
  }

  findForCompanyByIds(conversationIds: number[], companyId: number): Promise<ChatConversation[]> {
    return this.repository.find({
      where: { id: In(conversationIds), companyId },
      relations: ["participants", "participants.user"],
      order: { lastMessageAt: { direction: "DESC", nulls: "LAST" } },
    });
  }

  findByIdWithParticipantsOrFail(id: number): Promise<ChatConversation> {
    return this.repository.findOneOrFail({
      where: { id },
      relations: ["participants", "participants.user"],
    });
  }

  async findExistingDirectConversation(
    companyId: number,
    userIdA: number,
    userIdB: number,
  ): Promise<ChatConversation | null> {
    const result = await this.repository
      .createQueryBuilder("conv")
      .innerJoin("conv.participants", "pA", "pA.userId = :userIdA", { userIdA })
      .innerJoin("conv.participants", "pB", "pB.userId = :userIdB", { userIdB })
      .where("conv.companyId = :companyId", { companyId })
      .andWhere("conv.type = :type", { type: "direct" })
      .getOne();

    if (!result) {
      return null;
    }

    return this.repository.findOneOrFail({
      where: { id: result.id },
      relations: ["participants", "participants.user"],
    });
  }
}
