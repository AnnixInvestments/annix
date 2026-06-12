import { IsArray, IsInt, IsOptional } from "class-validator";
import { OptionalString, RequiredString } from "../../lib/dto/validation-decorators";

export class CreateAnnixOrbitTalentPoolDto {
  @RequiredString({ maxLength: 255 })
  name: string;

  @OptionalString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  candidateIds?: number[];
}

export class UpdateAnnixOrbitTalentPoolDto extends CreateAnnixOrbitTalentPoolDto {}
