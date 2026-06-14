import {
  OptionalIn,
  OptionalInt,
  OptionalString,
  RequiredInt,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import { ORBIT_SUBMISSION_STATUSES } from "../entities/annix-orbit-submission.entity";

export class CreateAnnixOrbitSubmissionDto {
  @RequiredInt()
  candidateId: number;

  @OptionalInt()
  clientId?: number | null;

  @RequiredString({ maxLength: 255 })
  jobTitle: string;

  @OptionalIn(ORBIT_SUBMISSION_STATUSES)
  status?: string;

  @OptionalString({ maxLength: 30 })
  interviewAt?: string | null;

  @OptionalString()
  feedback?: string | null;

  @OptionalString()
  notes?: string | null;
}

export class UpdateAnnixOrbitSubmissionDto {
  @OptionalInt()
  clientId?: number | null;

  @RequiredString({ maxLength: 255 })
  jobTitle: string;

  @OptionalIn(ORBIT_SUBMISSION_STATUSES)
  status?: string;

  @OptionalString({ maxLength: 30 })
  interviewAt?: string | null;

  @OptionalString()
  feedback?: string | null;

  @OptionalString()
  notes?: string | null;
}
