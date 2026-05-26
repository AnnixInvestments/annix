import { CrudRepository } from "../lib/persistence/crud-repository";
import { NixChatMessage } from "./entities/nix-chat-message.entity";

export abstract class NixChatMessageRepository extends CrudRepository<NixChatMessage> {
  abstract findRecentForSession(sessionId: number, limit: number): Promise<NixChatMessage[]>;
}
