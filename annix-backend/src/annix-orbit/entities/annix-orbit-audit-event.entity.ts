export const ORBIT_AUDIT_ACTIONS = [
  "candidate_submitted",
  "shortlist_sent",
  "consent_given",
  "consent_withdrawn",
] as const;
export type AnnixOrbitAuditAction = (typeof ORBIT_AUDIT_ACTIONS)[number];

export class AnnixOrbitAuditEvent {
  id: number;

  companyId: number;

  actorUserId: number;

  actorName: string;

  action: AnnixOrbitAuditAction;

  candidateId: number | null;

  submissionId: number | null;

  shortlistId: number | null;

  clientId: number | null;

  detail: string | null;

  createdAt: Date;

  updatedAt: Date;
}
