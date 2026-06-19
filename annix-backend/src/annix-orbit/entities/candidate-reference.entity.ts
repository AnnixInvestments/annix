import { Candidate } from "./candidate.entity";

export enum ReferenceStatus {
  PENDING = "pending",
  REQUESTED = "requested",
  RESPONDED = "responded",
  EXPIRED = "expired",
}

export class CandidateReference {
  id: number;

  name: string;

  email: string;

  relationship: string | null;

  feedbackToken: string;

  tokenExpiresAt: Date;

  feedbackRating: number | null;

  feedbackText: string | null;

  feedbackSubmittedAt: Date | null;

  status: ReferenceStatus;

  requestSentAt: Date | null;

  reminderSentAt: Date | null;

  candidate: Candidate;

  candidateId: number;

  createdAt: Date;

  updatedAt: Date;
}
