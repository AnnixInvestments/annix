import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import {
  QcpApprovalToken,
  type QcpApprovalTokenStatus,
} from "../entities/qcp-approval-token.entity";
import { QcpApprovalTokenRepository } from "./qcp-approval-token.repository";

@Injectable()
export class MongoQcpApprovalTokenRepository
  extends MongoCrudRepository<QcpApprovalToken>
  implements QcpApprovalTokenRepository
{
  constructor(@InjectModel("QcpApprovalToken") model: Model<QcpApprovalToken>) {
    super(model);
  }

  async findApprovedForPlanByRoles(
    controlPlanId: number,
    partyRoles: string[],
    status: QcpApprovalTokenStatus,
  ): Promise<QcpApprovalToken[]> {
    const docs = await this.documents
      .find({ controlPlanId, partyRole: { $in: partyRoles }, status })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByToken(token: string): Promise<QcpApprovalToken | null> {
    const doc = await this.documents.findOne({ token }).lean().exec();
    return this.toDomain(doc);
  }

  async findHistoryForPlan(controlPlanId: number, companyId: number): Promise<QcpApprovalToken[]> {
    const docs = await this.documents
      .find({ controlPlanId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, updates: Partial<QcpApprovalToken>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async supersedePendingForPlanAndRole(
    controlPlanId: number,
    partyRole: string,
    fromStatus: QcpApprovalTokenStatus,
    toStatus: QcpApprovalTokenStatus,
  ): Promise<void> {
    await this.documents
      .updateMany({ controlPlanId, partyRole, status: fromStatus }, { $set: { status: toStatus } })
      .exec();
  }

  async supersedeAllPendingForPlan(
    controlPlanId: number,
    fromStatus: QcpApprovalTokenStatus,
    toStatus: QcpApprovalTokenStatus,
  ): Promise<void> {
    await this.documents
      .updateMany({ controlPlanId, status: fromStatus }, { $set: { status: toStatus } })
      .exec();
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.deleteOne({ _id: id }).exec();
  }
}
