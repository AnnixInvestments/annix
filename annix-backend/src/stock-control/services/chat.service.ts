import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { ChatMessage } from "../entities/chat-message.entity";

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
  ) {}

  async messages(
    companyId: number,
    afterId: number | null,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    const qb = this.chatRepo
      .createQueryBuilder("msg")
      .where("msg.companyId = :companyId", { companyId })
      .orderBy("msg.createdAt", "ASC");

    if (afterId !== null) {
      const cursorMsg = await this.chatRepo.findOne({ where: { id: afterId } });
      if (cursorMsg) {
        qb.andWhere("msg.createdAt > :cursor", { cursor: cursorMsg.createdAt });
      }
    }

    return qb.take(limit).getMany();
  }

  async send(
    companyId: number,
    senderId: number,
    senderName: string,
    text: string,
    imageUrl: string | null,
  ): Promise<ChatMessage> {
    const message = this.chatRepo.create({
      companyId,
      senderId,
      senderName,
      text: text.trim(),
      imageUrl,
    });

    return this.chatRepo.save(message);
  }

  async update(messageId: number, senderId: number, text: string): Promise<{ success: boolean }> {
    const message = await this.chatRepo.findOne({ where: { id: messageId } });

    if (!message || message.senderId !== senderId) {
      return { success: false };
    }

    message.text = text.trim();
    message.editedAt = now().toJSDate();
    await this.chatRepo.save(message);

    return { success: true };
  }
}
