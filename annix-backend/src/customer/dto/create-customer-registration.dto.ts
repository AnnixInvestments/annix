import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsObject, IsString, Matches, MinLength, ValidateNested } from "class-validator";
import { COMPANY_SIZE_VALUES } from "../../lib/dto/common-company.dto";
import {
  OptionalEmail,
  OptionalIn,
  OptionalPhone,
  OptionalString,
  RequiredBoolean,
  RequiredEmail,
  RequiredPhone,
  RequiredString,
} from "../../lib/dto/validation-decorators";

export class CompanyDetailsDto {
  @ApiProperty({
    description: "Company legal name",
    example: "Acme Industrial Solutions (Pty) Ltd",
  })
  @RequiredString({ maxLength: 255 })
  legalName: string;

  @ApiPropertyOptional({
    description: "Trading name if different from legal name",
    example: "Acme Industrial",
  })
  @OptionalString({ maxLength: 255 })
  tradingName?: string;

  @ApiProperty({
    description: "Company registration number",
    example: "2020/123456/07",
  })
  @RequiredString({ maxLength: 50 })
  registrationNumber: string;

  @ApiPropertyOptional({
    description: "VAT registration number",
    example: "4123456789",
  })
  @OptionalString({ maxLength: 50 })
  vatNumber?: string;

  @ApiPropertyOptional({ description: "Industry type", example: "Mining" })
  @OptionalString({ maxLength: 100 })
  industry?: string;

  @ApiPropertyOptional({
    description: "Company size category",
    example: "medium",
  })
  @OptionalIn(COMPANY_SIZE_VALUES)
  companySize?: string;

  @ApiProperty({
    description: "Street address",
    example: "123 Industrial Road",
  })
  @RequiredString()
  streetAddress: string;

  @ApiProperty({ description: "City", example: "Johannesburg" })
  @RequiredString({ maxLength: 100 })
  city: string;

  @ApiProperty({ description: "Province or state", example: "Gauteng" })
  @RequiredString({ maxLength: 100 })
  provinceState: string;

  @ApiProperty({ description: "Postal code", example: "2000" })
  @RequiredString({ maxLength: 20 })
  postalCode: string;

  @ApiPropertyOptional({
    description: "Country",
    example: "South Africa",
    default: "South Africa",
  })
  @OptionalString({ maxLength: 100 })
  country?: string;

  @ApiPropertyOptional({
    description: "Currency code (ISO 4217)",
    example: "ZAR",
    default: "ZAR",
  })
  @OptionalString({ maxLength: 3 })
  currencyCode?: string;

  @ApiProperty({
    description: "Primary contact phone number",
    example: "+27 11 000 0123",
  })
  @RequiredPhone()
  primaryPhone: string;

  @ApiPropertyOptional({
    description: "Fax number",
    example: "+27 11 000 0124",
  })
  @OptionalString({ maxLength: 30 })
  faxNumber?: string;

  @ApiPropertyOptional({
    description: "General company email",
    example: "info@example.com",
  })
  @OptionalEmail()
  generalEmail?: string;

  @ApiPropertyOptional({
    description: "Company website",
    example: "https://www.example.com",
  })
  @OptionalString({ maxLength: 255 })
  website?: string;
}

export class UserDetailsDto {
  @ApiProperty({ description: "First name", example: "John" })
  @RequiredString({ maxLength: 100 })
  firstName: string;

  @ApiProperty({ description: "Last name", example: "Smith" })
  @RequiredString({ maxLength: 100 })
  lastName: string;

  @ApiPropertyOptional({
    description: "Job title or role",
    example: "Procurement Manager",
  })
  @OptionalString({ maxLength: 100 })
  jobTitle?: string;

  @ApiProperty({
    description: "Email address (used as login)",
    example: "john.smith@example.com",
  })
  @RequiredEmail()
  email: string;

  @ApiProperty({
    description: "Password (min 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)",
    example: "SecureP@ss!",
  })
  @IsString()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/, {
    message:
      "Password must be at least 10 characters with at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
  })
  password: string;

  @ApiPropertyOptional({
    description: "Direct phone number",
    example: "+27 11 000 0125",
  })
  @OptionalPhone()
  directPhone?: string;

  @ApiPropertyOptional({
    description: "Mobile phone number",
    example: "+27 82 000 0123",
  })
  @OptionalPhone()
  mobilePhone?: string;
}

export class DeviceBindingDto {
  @ApiProperty({
    description: "Device fingerprint hash",
    example: "a1b2c3d4e5f6...",
  })
  @RequiredString()
  deviceFingerprint: string;

  @ApiPropertyOptional({ description: "Browser and device information" })
  @IsObject()
  browserInfo?: Record<string, any>;

  @ApiProperty({ description: "Terms and conditions accepted", example: true })
  @RequiredBoolean()
  termsAccepted: boolean;

  @ApiProperty({
    description: "Security policy accepted (account locked to this device)",
    example: true,
  })
  @RequiredBoolean()
  securityPolicyAccepted: boolean;

  @ApiProperty({
    description: "Document storage policy accepted (secure encrypted storage)",
    example: true,
  })
  @RequiredBoolean()
  documentStorageAccepted: boolean;
}

export class CreateCustomerRegistrationDto {
  @ApiProperty({ description: "Company details", type: CompanyDetailsDto })
  @ValidateNested()
  @Type(() => CompanyDetailsDto)
  company: CompanyDetailsDto;

  @ApiProperty({ description: "User details", type: UserDetailsDto })
  @ValidateNested()
  @Type(() => UserDetailsDto)
  user: UserDetailsDto;

  @ApiProperty({
    description: "Security binding details",
    type: DeviceBindingDto,
  })
  @ValidateNested()
  @Type(() => DeviceBindingDto)
  security: DeviceBindingDto;
}
