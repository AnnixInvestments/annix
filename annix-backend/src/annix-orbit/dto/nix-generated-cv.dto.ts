import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsString, MaxLength, ValidateNested } from "class-validator";
import { OptionalString, RequiredString } from "../../lib/dto/validation-decorators";

class NixGeneratedCvContactDto {
  @OptionalString({ maxLength: 320 })
  email: string | null;

  @OptionalString({ maxLength: 60 })
  phone: string | null;

  @OptionalString({ maxLength: 300 })
  linkedin: string | null;
}

class NixGeneratedCvExperienceDto {
  @RequiredString({ maxLength: 200 })
  role: string;

  @RequiredString({ maxLength: 200 })
  employer: string;

  @RequiredString({ maxLength: 120 })
  period: string;

  @OptionalString({ maxLength: 200 })
  location: string | null;

  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  bullets: string[];
}

class NixGeneratedCvReferenceDto {
  @RequiredString({ maxLength: 200 })
  name: string;

  @OptionalString({ maxLength: 200 })
  position: string | null;

  @OptionalString({ maxLength: 200 })
  company: string | null;

  @OptionalString({ maxLength: 60 })
  phone: string | null;

  @OptionalString({ maxLength: 320 })
  email: string | null;
}

export class NixGeneratedCvDto {
  @RequiredString({ maxLength: 200 })
  fullName: string;

  @RequiredString({ maxLength: 300 })
  headlineTitle: string;

  @OptionalString({ maxLength: 200 })
  location: string | null;

  @ValidateNested()
  @Type(() => NixGeneratedCvContactDto)
  contact: NixGeneratedCvContactDto;

  @RequiredString({ maxLength: 5000 })
  professionalSummary: string;

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  coreCompetencies: string[];

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => NixGeneratedCvExperienceDto)
  experience: NixGeneratedCvExperienceDto[];

  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  education: string[];

  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  certifications: string[];

  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  professionalRegistrations: string[];

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  keySkills: string[];

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => NixGeneratedCvReferenceDto)
  references: NixGeneratedCvReferenceDto[];

  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  improvementsApplied: string[];

  @OptionalString({ maxLength: 2000 })
  closingNote: string | null;
}
