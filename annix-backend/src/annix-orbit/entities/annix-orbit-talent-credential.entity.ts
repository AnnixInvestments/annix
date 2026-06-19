// Industrial Skills Passport credential, owned by a recruiter and
// attached to one of their AnnixOrbitTalentCandidate records (issue
// #362 phase 3). Mirrors the seeker-side CvCredential but is scoped to
// the recruiter's company so the dashboard's expiring-document alerts
// can be queried per tenant without a candidate join. `verified` lets a
// recruiter mark a credential as sighted/checked.
export class AnnixOrbitTalentCredential {
  id: number;

  companyId: number;

  candidateId: number;

  credentialType: string;

  issuedAt: string | null;

  expiresAt: string | null;

  issuingAuthority: string | null;

  documentPath: string | null;

  verified: boolean;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
