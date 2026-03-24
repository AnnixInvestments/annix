import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class ComplySaSignupDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  @Matches(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  @Matches(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  @Matches(/\d/, { message: "Password must contain at least one digit" })
  @Matches(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" })
  password!: string;

  @IsString()
  name!: string;

  @IsBoolean()
  termsAccepted!: boolean;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @IsString()
  @IsOptional()
  idNumber?: string;

  @IsString()
  @IsOptional()
  passportNumber?: string;

  @IsString()
  @IsOptional()
  passportCountry?: string;

  @IsString()
  @IsOptional()
  sarsTaxReference?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  trustName?: string;

  @IsString()
  @IsOptional()
  trustRegistrationNumber?: string;

  @IsString()
  @IsOptional()
  mastersOffice?: string;

  @IsInt()
  @IsOptional()
  trusteeCount?: number;

  @IsString()
  @IsOptional()
  employeeCountRange?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  industrySector?: string;

  @IsArray()
  @IsOptional()
  complianceAreas?: string[];

  @IsBoolean()
  @IsOptional()
  profileComplete?: boolean;
}
