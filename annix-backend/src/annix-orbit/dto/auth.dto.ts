import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { COMPANY_SIZE_VALUES } from "../../lib/dto/common-company.dto";
import { RequiredIn, RequiredString } from "../../lib/dto/validation-decorators";
import { SEEKER_AGE_GROUPS } from "../entities/annix-orbit-profile.entity";

export class RegisterEeDisclosureDto {
  @IsString()
  populationGroup: string;

  @IsString()
  gender: string;

  @IsString()
  disabilityStatus: string;

  @IsBoolean()
  requiresAccommodation: boolean;

  @IsOptional()
  @IsString()
  accommodationNotes?: string | null;

  @IsString()
  nationalityStatus: string;

  @IsArray()
  @IsString({ each: true })
  purposes: string[];
}

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @RequiredString({ maxLength: 255 })
  companyName: string;

  @RequiredString({ maxLength: 100 })
  industry: string;

  @RequiredIn(COMPANY_SIZE_VALUES)
  companySize: string;

  @RequiredIn(SA_PROVINCES)
  province: string;

  @RequiredString({ maxLength: 100 })
  city: string;
}

export class RegisterRecruiterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @RequiredString({ maxLength: 255 })
  agencyName: string;

  @RequiredIn(SA_PROVINCES)
  province: string;

  @RequiredString({ maxLength: 100 })
  city: string;
}

export class RegisterIndividualDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsIn(SEEKER_AGE_GROUPS)
  ageGroup?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterEeDisclosureDto)
  eeDisclosure?: RegisterEeDisclosureDto;
}

export class RegisterStudentDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterEeDisclosureDto)
  eeDisclosure?: RegisterEeDisclosureDto;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  accountType?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}
