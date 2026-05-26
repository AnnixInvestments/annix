import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { NixChatSession } from "./entities/nix-chat-session.entity";
import { NixChatSessionRepository } from "./nix-chat-session.repository";

@Injectable()
export class PostgresNixChatSessionRepository
  extends TypeOrmCrudRepository<NixChatSession>
  implements NixChatSessionRepository
{
  constructor(@InjectRepository(NixChatSession) repository: Repository<NixChatSession>) {
    super(repository);
  }

  findActiveForUser(
    userId: number,
    rfqId: number | null | undefined,
  ): Promise<NixChatSession | null> {
    return this.repository.findOne({
      where: {
        userId,
        rfqId: rfqId ?? IsNull(),
        isActive: true,
      },
    });
  }
}
