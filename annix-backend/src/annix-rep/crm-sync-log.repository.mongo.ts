import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CrmSyncLogRepository } from "./crm-sync-log.repository";
import { CrmSyncLog } from "./entities/crm-sync-log.entity";

@Injectable()
export class MongoCrmSyncLogRepository
  extends MongoCrudRepository<CrmSyncLog>
  implements CrmSyncLogRepository
{
  constructor(@InjectModel("CrmSyncLog") model: Model<CrmSyncLog>) {
    super(model);
  }

  async findByConfigPaginated(
    configId: number,
    limit: number,
    offset: number,
  ): Promise<{ logs: CrmSyncLog[]; total: number }> {
    const [docs, total] = await Promise.all([
      this.documents
        .find({ configId })
        .sort({ startedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.documents.countDocuments({ configId }).exec(),
    ]);
    return { logs: this.toDomainList(docs), total };
  }
}
