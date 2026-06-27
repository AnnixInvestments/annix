export interface RegionCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export class NixExtractionRegion {
  id: number;

  documentCategory: string;

  fieldName: string;

  regionCoordinates: RegionCoordinates;

  labelCoordinates: RegionCoordinates | null;

  labelText: string | null;

  extractionPattern: string | null;

  sampleValue: string | null;

  confidenceThreshold: number;

  useCount: number;

  successCount: number;

  createdByUserId: number | null;

  isActive: boolean;

  isCustomField: boolean;

  /**
   * True when written by an UNAUTHENTICATED caller (anonymous supplier-
   * registration document annotation). Quarantined regions are persisted in
   * their own lane and excluded from `findActiveForCategory`, so a tokenless
   * actor cannot overwrite an admin-trained OCR rectangle that feeds the
   * cross-tenant registration-document verifier. Absent/false on all trusted
   * (authenticated/admin + pre-existing) regions.
   */
  quarantined?: boolean;

  createdAt: Date;

  updatedAt: Date;
}
