import { RubberPoExtractionTemplate } from "./rubber-po-extraction-template.entity";

export interface RegionCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export class RubberPoExtractionRegion {
  id: number;

  templateId: number;

  template: RubberPoExtractionTemplate;

  fieldName: string;

  regionCoordinates: RegionCoordinates;

  labelCoordinates: RegionCoordinates | null;

  labelText: string | null;

  extractionPattern: string | null;

  sampleValue: string | null;

  confidenceThreshold: number;

  createdAt: Date;

  updatedAt: Date;
}
