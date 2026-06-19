export class CvCredential {
  id: number;

  candidateId: number;

  credentialType: string;

  issuedAt: string | null;

  expiresAt: string | null;

  issuingAuthority: string | null;

  documentPath: string | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
