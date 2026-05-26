import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NixChatMessage } from "./entities/nix-chat-message.entity";
import { NixChatMessageRepository } from "./nix-chat-message.repository";

@Injectable()
export class MongoNixChatMessageRepository
  extends MongoCrudRepository<NixChatMessage>
  implements NixChatMessageRepository
{
  constructor(@InjectModel("NixChatMessage") model: Model<NixChatMessage>) {
    super(model);
  }

  async findRecentForSession(sessionId: number, limit: number): Promise<NixChatMessage[]> {
    return this.toDomainList(
      await this.documents.find({ sessionId }).sort({ createdAt: -1 }).limit(limit).lean().exec(),
    );
  }
}
