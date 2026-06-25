import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NixChatSession, NixSessionOwner } from "./entities/nix-chat-session.entity";
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
    owner: NixSessionOwner,
    rfqId: number | null | undefined,
  ): Promise<NixChatSession | null> {
    return this.toDomain(
      await this.documents
        .findOne({
          userId: owner.userId,
          appScope: owner.appScope,
          rfqId: rfqId === undefined || rfqId === null ? null : rfqId,
          isActive: true,
        })
        .lean()
        .exec(),
    );
  }

  async findOwnedById(sessionId: number, owner: NixSessionOwner): Promise<NixChatSession | null> {
    return this.toDomain(
      await this.documents
        .findOne({
          _id: sessionId,
          userId: owner.userId,
          appScope: owner.appScope,
        })
        .lean()
        .exec(),
    );
  }
}
