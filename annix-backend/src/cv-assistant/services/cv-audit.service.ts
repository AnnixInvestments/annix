import { Injectable, Logger } from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";

const APP_NAME = "cv-assistant";
const ENTITY_TYPE = "cv_candidate";

export type ScreeningDecision =
  | "auto_rejected"
  | "auto_shortlisted"
  | "acknowledged"
  | "shortlisted"
  | "manual_rejected"
  | "manual_accepted";

export type ConsentSource = "email" | "portal" | "admin";
export type ErasureReason = "inactive" | "requested";

@Injectable()
export class CvAuditService {
  private readonly logger = new Logger(CvAuditService.name);

  constructor(private readonly auditService: AuditService) {}

  async logScreeningDecision(
    candidateId: number,
    jobPostingId: number,
    decision: ScreeningDecision,
    reasons: string[],
    actorId: number | null,
  ): Promise<void> {
    await this.safeLog({
      subAction: `screening_${decision}`,
      entityId: candidateId,
      userId: actorId,
      details: {
        decision,
        reasons,
        jobPostingId,
        automated: actorId === null,
      },
    });
  }

  async logHrOverride(
    candidateId: number,
    fromStatus: string,
    toStatus: string,
    reason: string | null,
    actorId: number,
  ): Promise<void> {
    await this.safeLog({
      subAction: "hr_override",
      entityId: candidateId,
      userId: actorId,
      details: {
        fromStatus,
        toStatus,
        reason: reason ?? null,
      },
    });
  }

  async logCvErasure(candidateId: number, reason: ErasureReason): Promise<void> {
    await this.safeLog({
      subAction: "cv_erasure",
      entityId: candidateId,
      userId: null,
      details: { reason },
    });
  }

  async logConsentChange(
    candidateId: number | null,
    granted: boolean,
    source: ConsentSource,
    userId: number | null = null,
  ): Promise<void> {
    await this.safeLog({
      subAction: "popia_consent_change",
      entityId: candidateId,
      userId,
      details: { granted, source },
    });
  }

  async logDataExport(candidateId: number | null, actorId: number | null): Promise<void> {
    await this.safeLog({
      subAction: "data_export",
      entityId: candidateId,
      userId: actorId,
      details: {},
    });
  }

  private async safeLog(input: {
    subAction: string;
    entityId: number | null;
    userId: number | null;
    details: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditService.logApp({
        appName: APP_NAME,
        subAction: input.subAction,
        entityType: ENTITY_TYPE,
        entityId: input.entityId,
        userId: input.userId,
        details: input.details,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write CV audit log (${input.subAction}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
