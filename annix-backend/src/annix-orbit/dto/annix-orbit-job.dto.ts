import { IsArray, IsOptional } from "class-validator";
import {
  OptionalIn,
  OptionalInt,
  OptionalNumber,
  OptionalString,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import { ORBIT_JOB_STATUSES } from "../entities/annix-orbit-job.entity";

export class CreateAnnixOrbitJobDto {
  @OptionalInt()
  clientId?: number | null;

  @RequiredString({ maxLength: 255 })
  title: string;

  @OptionalString()
  description?: string | null;

  @OptionalString({ maxLength: 100 })
  province?: string | null;

  @OptionalString({ maxLength: 100 })
  city?: string | null;

  @OptionalString({ maxLength: 50 })
  employmentType?: string | null;

  @OptionalNumber()
  salaryMin?: number | null;

  @OptionalNumber()
  salaryMax?: number | null;

  @IsOptional()
  @IsArray()
  requiredSkills?: string[];

  @OptionalInt()
  openings?: number;

  @OptionalIn(ORBIT_JOB_STATUSES)
  status?: string;

  @OptionalString({ maxLength: 20 })
  closingDate?: string | null;

  @OptionalString()
  notes?: string | null;
}

export class UpdateAnnixOrbitJobDto extends CreateAnnixOrbitJobDto {}
