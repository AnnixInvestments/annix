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

  createdAt: Date;

  updatedAt: Date;
}
