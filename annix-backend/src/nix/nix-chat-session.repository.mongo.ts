import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NixChatSession } from "./entities/nix-chat-session.entity";
import { NixChatSessionRepository } from "./nix-chat-session.repository";

@Injectable()
export class MongoNixChatSessionRepository
  extends MongoCrudRepository<NixChatSession>
  implements NixChatSessionRepository
{
  constructor(@InjectModel("NixChatSession") model: Model<NixChatSession>) {
    super(model);
  }

  async findActiveForUser(
    userId: number,
    rfqId: number | null | undefined,
  ): Promise<NixChatSession | null> {
    return this.toDomain(
      await this.documents
        .findOne({
          userId,
          rfqId: rfqId === undefined || rfqId === null ? null : rfqId,
          isActive: true,
        })
        .lean()
        .exec(),
    );
  }
}
