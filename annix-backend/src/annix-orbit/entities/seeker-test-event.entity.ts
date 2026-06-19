export class SeekerTestEvent {
  id: string;

  candidateId: number | null;

  eventName: string;

  ts: Date;

  durationMs: number | null;

  ok: boolean;

  errorMessage: string | null;

  page: string | null;

  phaseId: string | null;

  metadata: Record<string, unknown> | null;

  createdAt: Date;

  updatedAt: Date;
}
