import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { NixChatMessage } from "./entities/nix-chat-message.entity";
import { NixChatMessageRepository } from "./nix-chat-message.repository";

@Injectable()
export class PostgresNixChatMessageRepository
  extends TypeOrmCrudRepository<NixChatMessage>
  implements NixChatMessageRepository
{
  constructor(@InjectRepository(NixChatMessage) repository: Repository<NixChatMessage>) {
    super(repository);
  }

  findRecentForSession(sessionId: number, limit: number): Promise<NixChatMessage[]> {
    return this.repository.find({
      where: { sessionId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
