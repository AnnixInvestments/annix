import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { InboundEmailConfig } from "./entities/inbound-email-config.entity";
import { InboundEmailConfigRepository } from "./inbound-email-config.repository";

@Injectable()
export class PostgresInboundEmailConfigRepository
  extends TypeOrmCrudRepository<InboundEmailConfig>
  implements InboundEmailConfigRepository
{
  constructor(@InjectRepository(InboundEmailConfig) repository: Repository<InboundEmailConfig>) {
    super(repository);
  }

  findByAppAndCompany(app: string, companyId: number): Promise<InboundEmailConfig | null> {
    return this.repository.findOne({ where: { app, companyId } });
  }

  findAllEnabled(): Promise<InboundEmailConfig[]> {
    return this.repository.find({ where: { enabled: true } });
  }

  async updateLastPoll(id: number, lastPollAt: Date, lastError: string | null): Promise<void> {
    await this.repository.update(id, { lastPollAt, lastError });
  }
}
