export enum DocumentVersionStatus {
  ACTIVE = "ACTIVE",
  PENDING_AUTHORIZATION = "PENDING_AUTHORIZATION",
  SUPERSEDED = "SUPERSEDED",
  REJECTED = "REJECTED",
}

export const DOCUMENT_VERSION_STATUS_LABELS: Record<DocumentVersionStatus, string> = {
  [DocumentVersionStatus.ACTIVE]: "Active",
  [DocumentVersionStatus.PENDING_AUTHORIZATION]: "Awaiting Authorization",
  [DocumentVersionStatus.SUPERSEDED]: "Superseded",
  [DocumentVersionStatus.REJECTED]: "Rejected",
};
