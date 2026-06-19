export class EducationExtractionCorrection {
  id: string;

  institutionId: string | null;

  fieldKey: string;

  extractedValue: Record<string, unknown>;

  correctedValue: Record<string, unknown>;

  sourceUrl: string | null;

  createdAt: Date;
}
