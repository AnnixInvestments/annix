export const ORBIT_SUBMISSION_STATUSES = [
  "submitted",
  "viewed",
  "interested",
  "interview",
  "offer",
  "placed",
  "rejected",
  "no_response",
] as const;
export type AnnixOrbitSubmissionStatus = (typeof ORBIT_SUBMISSION_STATUSES)[number];

export class AnnixOrbitSubmission {
  id: number;

  companyId: number;

  // Consultant who owns this submission — drives the dashboard
  // Top-Consultants leaderboard (issue #362). Stamped to the creating
  // user; null on rows created before attribution existed.
  consultantUserId: number | null;

  candidateId: number;

  clientId: number | null;

  jobTitle: string;

  status: AnnixOrbitSubmissionStatus;

  submittedAt: string | null;

  // Scheduled interview date/time (ISO) — set when the submission
  // reaches the interview stage; powers the dashboard Upcoming
  // Interviews widget (issue #362 phase 6).
  interviewAt: string | null;

  feedback: string | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
