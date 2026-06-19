/**
 * Audit log of every AI mentor answer (guardrail: grounded AI only — the mentor
 * reasons over curated DB rows captured in `groundingContext`, never free-form
 * facts). Logged for auditability and the "not a counselor" framing.
 */
export class EducationAiAdviceLog {
  id: string;

  educationProfileId: string | null;

  question: string;

  answer: string;

  groundingContext: Record<string, unknown> | null;

  model: string | null;

  createdAt: Date;
}
