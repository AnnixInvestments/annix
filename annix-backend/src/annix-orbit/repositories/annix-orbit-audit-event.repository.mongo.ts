import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitAuditEvent } from "../entities/annix-orbit-audit-event.entity";
import { AnnixOrbitAuditEventRepository } from "./annix-orbit-audit-event.repository";

@Injectable()
export class MongoAnnixOrbitAuditEventRepository
  extends MongoCrudRepository<AnnixOrbitAuditEvent>
  implements AnnixOrbitAuditEventRepository
{
  constructor(@InjectModel("AnnixOrbitAuditEvent") model: Model<AnnixOrbitAuditEvent>) {
    super(model);
  }

  async findForCandidate(candidateId: number, companyId: number): Promise<AnnixOrbitAuditEvent[]> {
    const docs = await this.documents
      .find({ companyId, candidateId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
