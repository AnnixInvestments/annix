import { CrudRepository } from "../lib/persistence/crud-repository";
import { NixChatSession, NixSessionOwner } from "./entities/nix-chat-session.entity";

export abstract class NixChatSessionRepository extends CrudRepository<NixChatSession> {
  abstract findActiveForUser(
    owner: NixSessionOwner,
    rfqId: number | null | undefined,
  ): Promise<NixChatSession | null>;

  abstract findOwnedById(sessionId: number, owner: NixSessionOwner): Promise<NixChatSession | null>;
}
