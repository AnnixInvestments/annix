import { CrudRepository } from "../../../lib/persistence/crud-repository";
import {
  QcpApprovalToken,
  type QcpApprovalTokenStatus,
} from "../entities/qcp-approval-token.entity";

export abstract class QcpApprovalTokenRepository extends CrudRepository<QcpApprovalToken> {
  abstract findApprovedForPlanByRoles(
    controlPlanId: number,
    partyRoles: string[],
    status: QcpApprovalTokenStatus,
  ): Promise<QcpApprovalToken[]>;
  abstract findByToken(token: string): Promise<QcpApprovalToken | null>;
  abstract findHistoryForPlan(
    controlPlanId: number,
    companyId: number,
  ): Promise<QcpApprovalToken[]>;
  abstract updateById(id: number, updates: Partial<QcpApprovalToken>): Promise<void>;
  abstract supersedePendingForPlanAndRole(
    controlPlanId: number,
    partyRole: string,
    fromStatus: QcpApprovalTokenStatus,
    toStatus: QcpApprovalTokenStatus,
  ): Promise<void>;
  abstract supersedeAllPendingForPlan(
    controlPlanId: number,
    fromStatus: QcpApprovalTokenStatus,
    toStatus: QcpApprovalTokenStatus,
  ): Promise<void>;
  abstract deleteById(id: number): Promise<void>;
}
