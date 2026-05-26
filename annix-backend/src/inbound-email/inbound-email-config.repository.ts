import { CrudRepository } from "../lib/persistence/crud-repository";
import { InboundEmailConfig } from "./entities/inbound-email-config.entity";

export abstract class InboundEmailConfigRepository extends CrudRepository<InboundEmailConfig> {
  abstract findByAppAndCompany(app: string, companyId: number): Promise<InboundEmailConfig | null>;
  abstract findAllEnabled(): Promise<InboundEmailConfig[]>;
  abstract updateLastPoll(id: number, lastPollAt: Date, lastError: string | null): Promise<void>;
}
