import {
  OptionalBoolean,
  OptionalIn,
  OptionalInt,
  OptionalNumber,
  OptionalString,
  OptionalStringArray,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import {
  ORBIT_CANDIDATE_STATUSES,
  ORBIT_CANDIDATE_VISIBILITIES,
} from "../entities/annix-orbit-talent-candidate.entity";

export class CreateAnnixOrbitTalentCandidateDto {
  @OptionalIn(ORBIT_CANDIDATE_VISIBILITIES)
  visibility?: string;

  @RequiredString({ maxLength: 255 })
  fullName: string;

  @OptionalString({ maxLength: 255 })
  email?: string | null;

  @OptionalString({ maxLength: 50 })
  phone?: string | null;

  @OptionalString({ maxLength: 255 })
  currentRole?: string | null;

  @OptionalString({ maxLength: 100 })
  province?: string | null;

  @OptionalString({ maxLength: 100 })
  city?: string | null;

  @OptionalInt()
  yearsExperience?: number | null;

  @OptionalStringArray()
  skills?: string[] | null;

  @OptionalNumber()
  salaryExpectation?: number | null;

  @OptionalString({ maxLength: 100 })
  availability?: string | null;

  @OptionalString({ maxLength: 100 })
  noticePeriod?: string | null;

  @OptionalBoolean()
  willingToRelocate?: boolean;

  @OptionalIn(ORBIT_CANDIDATE_STATUSES)
  status?: string;

  @OptionalString()
  notes?: string | null;

  @OptionalBoolean()
  consentToShare?: boolean;

  @OptionalString({ maxLength: 30 })
  consentGivenAt?: string | null;

  @OptionalString({ maxLength: 100 })
  consentSource?: string | null;

  @OptionalString()
  cvText?: string | null;

  @OptionalString({ maxLength: 500 })
  cvFilePath?: string | null;
}

export class UpdateAnnixOrbitTalentCandidateDto extends CreateAnnixOrbitTalentCandidateDto {}
