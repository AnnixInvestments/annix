export const ORBIT_COMPLIANCE_DOC_TYPES = [
  "ID document",
  "Qualification",
  "Certificate",
  "Driver's licence",
  "References",
  "Police clearance",
  "Medical certificate",
  "Work permit",
  "Tax number",
  "Bank confirmation",
  "Other",
] as const;

export const ORBIT_COMPLIANCE_STATUSES = [
  "missing",
  "received",
  "verified",
  "expiring",
  "expired",
] as const;
export type AnnixOrbitComplianceStatus = (typeof ORBIT_COMPLIANCE_STATUSES)[number];

export class AnnixOrbitComplianceItem {
  id: number;

  companyId: number;

  candidateId: number;

  documentType: string;

  status: AnnixOrbitComplianceStatus;

  expiryDate: string | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
