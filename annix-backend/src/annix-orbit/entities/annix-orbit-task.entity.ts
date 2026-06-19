// Minimal recruiter task list (issue #362 phase 6) — powers the
// dashboard Tasks card ("N due today") and the Tasks page.
export class AnnixOrbitTask {
  id: number;

  companyId: number;

  ownerUserId: number;

  title: string;

  dueDate: string | null;

  done: boolean;

  relatedCandidateId: number | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
