import { Candidate } from "./candidate.entity";
import { JobPosting } from "./job-posting.entity";

export class AnnixOrbitEeDisclosureInvite {
  id: number;

  candidate: Candidate;

  candidateId: number;

  jobPosting: JobPosting;

  jobPostingId: number;

  token: string;

  expiresAt: Date;

  usedAt: Date | null;

  createdAt: Date;
}
