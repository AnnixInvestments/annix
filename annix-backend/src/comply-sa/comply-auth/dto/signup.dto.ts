import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class ComplySaSignupDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  @IsString()
  companyName!: string;

  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @IsBoolean()
  termsAccepted!: boolean;
}
