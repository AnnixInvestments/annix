import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { COMPANY_SIZE_VALUES } from "../../lib/dto/common-company.dto";
import { RequiredIn, RequiredString } from "../../lib/dto/validation-decorators";

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

  @IsString()
  @IsOptional()
  companyName?: string;

  @RequiredString({ maxLength: 100 })
  industry: string;

  @RequiredIn(COMPANY_SIZE_VALUES)
  companySize: string;

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
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
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
