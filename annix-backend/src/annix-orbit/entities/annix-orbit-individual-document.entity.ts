import { AnnixOrbitProfile } from "./annix-orbit-profile.entity";

export enum IndividualDocumentKind {
  CV = "cv",
  QUALIFICATION = "qualification",
  CERTIFICATE = "certificate",
}

export interface CredentialFields {
  credentialName: string | null;
  issuer: string | null;
  dateAwarded: string | null;
  nqfLevel: string | null;
  expiry: string | null;
}

export class AnnixOrbitIndividualDocument {
  id: number;

  profile: AnnixOrbitProfile;

  profileId: number;

  kind: IndividualDocumentKind;

  filePath: string;

  originalFilename: string;

  mimeType: string;

  sizeBytes: number;

  label: string | null;

  isPhotoCapture: boolean;

  needsClearScan: boolean;

  scanRemindersSent: number;

  lastScanReminderAt: Date | null;

  credentialFields: CredentialFields | null;

  uploadedAt: Date;
}
