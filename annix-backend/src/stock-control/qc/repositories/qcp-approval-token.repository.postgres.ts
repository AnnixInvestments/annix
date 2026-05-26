import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../../lib/persistence/typeorm-crud-repository";
import {
  QcpApprovalToken,
  type QcpApprovalTokenStatus,
  type QcpPartyRole,
} from "../entities/qcp-approval-token.entity";
import { QcpApprovalTokenRepository } from "./qcp-approval-token.repository";

@Injectable()
export class PostgresQcpApprovalTokenRepository
  extends TypeOrmCrudRepository<QcpApprovalToken>
  implements QcpApprovalTokenRepository
{
  constructor(@InjectRepository(QcpApprovalToken) repository: Repository<QcpApprovalToken>) {
    super(repository);
  }

  findApprovedForPlanByRoles(
    controlPlanId: number,
    partyRoles: string[],
    status: QcpApprovalTokenStatus,
  ): Promise<QcpApprovalToken[]> {
    return this.repository.find({
      where: partyRoles.map((role) => ({
        controlPlanId,
        partyRole: role as QcpPartyRole,
        status,
      })),
    });
  }

  findByToken(token: string): Promise<QcpApprovalToken | null> {
    return this.repository.findOne({ where: { token } });
  }

  findHistoryForPlan(controlPlanId: number, companyId: number): Promise<QcpApprovalToken[]> {
    return this.repository.find({
      where: { controlPlanId, companyId },
      order: { createdAt: "DESC" },
    });
  }

  async updateById(id: number, updates: Partial<QcpApprovalToken>): Promise<void> {
    await this.repository.update(id, updates);
  }

  async supersedePendingForPlanAndRole(
    controlPlanId: number,
    partyRole: string,
    fromStatus: QcpApprovalTokenStatus,
    toStatus: QcpApprovalTokenStatus,
  ): Promise<void> {
    await this.repository.update(
      { controlPlanId, partyRole: partyRole as QcpPartyRole, status: fromStatus },
      { status: toStatus },
    );
  }

  async supersedeAllPendingForPlan(
    controlPlanId: number,
    fromStatus: QcpApprovalTokenStatus,
    toStatus: QcpApprovalTokenStatus,
  ): Promise<void> {
    await this.repository.update({ controlPlanId, status: fromStatus }, { status: toStatus });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
