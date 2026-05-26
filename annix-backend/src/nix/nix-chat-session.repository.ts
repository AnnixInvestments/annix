import { CrudRepository } from "../lib/persistence/crud-repository";
import { NixChatSession } from "./entities/nix-chat-session.entity";

export abstract class NixChatSessionRepository extends CrudRepository<NixChatSession> {
  abstract findActiveForUser(
    userId: number,
    rfqId: number | null | undefined,
  ): Promise<NixChatSession | null>;
}
