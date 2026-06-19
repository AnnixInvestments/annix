/**
 * A recorded consent for processing an education profile's data. For minors this
 * must be granted by a guardian (D3/D4); adults grant it themselves. References a
 * versioned consent text (reuses Orbit's consent-text-version machinery) and is
 * jurisdiction-tagged (POPIA/GDPR live; FERPA/COPPA slot-ready).
 */
export class EducationConsent {
  id: string;

  educationProfileId: string;

  consentTextVersionId: number | null;

  jurisdiction: string;

  grantedByUserId: number;

  grantedByRole: string;

  grantedAt: Date;

  revokedAt: Date | null;

  createdAt: Date;
}
