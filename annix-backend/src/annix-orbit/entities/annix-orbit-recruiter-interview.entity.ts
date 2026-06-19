export const ORBIT_INTERVIEW_TYPES = ["phone", "video", "in_person"] as const;
export type AnnixOrbitInterviewType = (typeof ORBIT_INTERVIEW_TYPES)[number];

export const ORBIT_INTERVIEW_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "no_show",
  "rescheduled",
  "passed",
  "rejected",
] as const;
export type AnnixOrbitInterviewStatus = (typeof ORBIT_INTERVIEW_STATUSES)[number];

export class AnnixOrbitRecruiterInterview {
  id: number;

  companyId: number;

  candidateId: number | null;

  clientId: number | null;

  candidateName: string;

  jobTitle: string | null;

  scheduledAt: string | null;

  interviewType: AnnixOrbitInterviewType;

  status: AnnixOrbitInterviewStatus;

  feedback: string | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
