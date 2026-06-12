import {
  OptionalIn,
  OptionalInt,
  OptionalString,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import {
  ORBIT_INTERVIEW_STATUSES,
  ORBIT_INTERVIEW_TYPES,
} from "../entities/annix-orbit-recruiter-interview.entity";

export class CreateAnnixOrbitRecruiterInterviewDto {
  @OptionalInt()
  candidateId?: number | null;

  @OptionalInt()
  clientId?: number | null;

  @RequiredString({ maxLength: 255 })
  candidateName: string;

  @OptionalString({ maxLength: 255 })
  jobTitle?: string | null;

  @OptionalString({ maxLength: 30 })
  scheduledAt?: string | null;

  @OptionalIn(ORBIT_INTERVIEW_TYPES)
  interviewType?: string;

  @OptionalIn(ORBIT_INTERVIEW_STATUSES)
  status?: string;

  @OptionalString()
  feedback?: string | null;

  @OptionalString()
  notes?: string | null;
}

export class UpdateAnnixOrbitRecruiterInterviewDto extends CreateAnnixOrbitRecruiterInterviewDto {}
