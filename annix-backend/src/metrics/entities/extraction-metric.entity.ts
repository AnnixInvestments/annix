export class ExtractionMetric {
  id: number;

  category: string;

  operation: string;

  durationMs: number;

  payloadSizeBytes: number | null;

  succeeded: boolean;

  failureReason: string | null;

  createdAt: Date;
}
