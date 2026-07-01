import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { PaginatedResult } from "../../lib/dto/pagination-query.dto";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RfqSourcingSendAudit } from "./entities/rfq-sourcing-send-audit.entity";
import { RfqSourcingSendAuditRepository } from "./rfq-sourcing-send-audit.repository";

@Injectable()
export class MongoRfqSourcingSendAuditRepository
  extends MongoCrudRepository<RfqSourcingSendAudit>
  implements RfqSourcingSendAuditRepository
{
  constructor(@InjectModel("RfqSourcingSendAudit") model: Model<RfqSourcingSendAudit>) {
    super(model);
  }

  async findBySession(sessionId: number): Promise<RfqSourcingSendAudit[]> {
    return this.toDomainList(
      await this.documents.find({ sessionId }).sort({ createdAt: -1 }).lean().exec(),
    );
  }

  pageForCompany(
    companyId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<RfqSourcingSendAudit>> {
    return this.findPage({ companyId }, { page, limit, sort: { createdAt: "DESC" } });
  }

  override save(): Promise<RfqSourcingSendAudit> {
    return Promise.reject(new Error("Sourcing send audit records are append-only"));
  }

  override remove(): Promise<void> {
    return Promise.reject(new Error("Sourcing send audit records are append-only"));
  }
}
