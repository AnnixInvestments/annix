import { IsArray, IsInt, IsOptional } from "class-validator";
import {
  OptionalIn,
  OptionalInt,
  OptionalString,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import { ORBIT_SHORTLIST_STATUSES } from "../entities/annix-orbit-shortlist.entity";

export class CreateAnnixOrbitShortlistDto {
  @RequiredString({ maxLength: 255 })
  name: string;

  @OptionalString({ maxLength: 255 })
  jobTitle?: string | null;

  @OptionalInt()
  clientId?: number | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  candidateIds?: number[];

  @OptionalIn(ORBIT_SHORTLIST_STATUSES)
  status?: string;

  @OptionalString()
  notes?: string | null;
}

export class UpdateAnnixOrbitShortlistDto extends CreateAnnixOrbitShortlistDto {}
