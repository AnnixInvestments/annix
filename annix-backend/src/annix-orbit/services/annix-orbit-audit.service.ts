import { Injectable, Logger } from "@nestjs/common";
import {
  type AnnixOrbitAuditAction,
  type AnnixOrbitAuditEvent,
} from "../entities/annix-orbit-audit-event.entity";
import { AnnixOrbitAuditEventRepository } from "../repositories/annix-orbit-audit-event.repository";

export interface AnnixOrbitAuditActor {
  id: number;
  name: string;
}

export interface AnnixOrbitAuditInput {
  action: AnnixOrbitAuditAction;
  candidateId?: number | null;
  submissionId?: number | null;
  shortlistId?: number | null;
  clientId?: number | null;
  detail?: string | null;
}

@Injectable()
export class AnnixOrbitAuditService {
  private readonly logger = new Logger(AnnixOrbitAuditService.name);

  constructor(private readonly auditRepo: AnnixOrbitAuditEventRepository) {}

  async record(
    companyId: number,
    actor: AnnixOrbitAuditActor,
    input: AnnixOrbitAuditInput,
  ): Promise<void> {
    try {
      await this.auditRepo.create({
        companyId,
        actorUserId: actor.id,
        actorName: actor.name || "Unknown",
        action: input.action,
        candidateId: input.candidateId ?? null,
        submissionId: input.submissionId ?? null,
        shortlistId: input.shortlistId ?? null,
        clientId: input.clientId ?? null,
        detail: input.detail ?? null,
      });
    } catch (error) {
      this.logger.warn(`Failed to record audit event ${input.action}: ${String(error)}`);
    }
  }

  forCandidate(candidateId: number, companyId: number): Promise<AnnixOrbitAuditEvent[]> {
    return this.auditRepo.findForCandidate(candidateId, companyId);
  }
}
