export class SeekerApplyClick {
  id: number;

  candidateId: number;

  externalJobId: number | null;

  matchId: number | null;

  sourceUrl: string | null;

  status: string | null;

  notes: string | null;

  dismissed: boolean;

  // Snapshot of the job at apply time so the application stays meaningful even
  // after the external job is pruned / re-ingested / delisted off the board.
  jobTitle: string | null;

  jobCompany: string | null;

  jobLocation: string | null;

  jobSalaryMin: number | null;

  jobSalaryMax: number | null;

  jobSalaryCurrency: string | null;

  clickedAt: Date;
}
