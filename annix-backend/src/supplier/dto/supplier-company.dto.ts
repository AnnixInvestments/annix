import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { COMPANY_SIZE_VALUES } from "../../lib/dto/common-company.dto";
import {
  OptionalBoolean,
  OptionalDateString,
  OptionalEmail,
  OptionalIn,
  OptionalInt,
  OptionalPhone,
  OptionalString,
  OptionalStringArray,
  RequiredEmail,
  RequiredPhone,
  RequiredString,
} from "../../lib/dto/validation-decorators";

export class SupplierCompanyDto {
  @ApiProperty({
    description: "Company legal name",
    example: "ABC Supplies (Pty) Ltd",
  })
  @RequiredString({ maxLength: 255 })
  legalName: string;

  @ApiPropertyOptional({
    description: "Trading name if different from legal name",
    example: "ABC Supplies",
  })
  @OptionalString({ maxLength: 255 })
  tradingName?: string;

  @ApiProperty({
    description: "Company registration number (CIPC)",
    example: "2020/123456/07",
  })
  @RequiredString({ maxLength: 50 })
  registrationNumber: string;

  @ApiPropertyOptional({ description: "Tax number", example: "1234567890" })
  @OptionalString({ maxLength: 50 })
  taxNumber?: string;

  @ApiPropertyOptional({
    description: "VAT registration number",
    example: "4123456789",
  })
  @OptionalString({ maxLength: 50 })
  vatNumber?: string;

  @ApiProperty({
    description: "Street address",
    example: "456 Supplier Avenue",
  })
  @RequiredString()
  streetAddress: string;

  @ApiPropertyOptional({ description: "Address line 2", example: "Unit 5" })
  @OptionalString()
  addressLine2?: string;

  @ApiProperty({ description: "City", example: "Cape Town" })
  @RequiredString({ maxLength: 100 })
  city: string;

  @ApiProperty({ description: "Province or state", example: "Western Cape" })
  @RequiredString({ maxLength: 100 })
  provinceState: string;

  @ApiProperty({ description: "Postal code", example: "8001" })
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

  @ApiProperty({ description: "Primary contact name", example: "Jane Doe" })
  @RequiredString({ maxLength: 200 })
  primaryContactName: string;

  @ApiProperty({
    description: "Primary contact email",
    example: "jane@example.com",
  })
  @RequiredEmail()
  primaryContactEmail: string;

  @ApiProperty({
    description: "Primary contact phone",
    example: "+27 21 000 0123",
  })
  @RequiredPhone()
  primaryContactPhone: string;

  @ApiPropertyOptional({
    description: "Company main phone number",
    example: "+27 21 000 0100",
  })
  @OptionalPhone()
  primaryPhone?: string;

  @ApiPropertyOptional({
    description: "Fax number",
    example: "+27 21 000 0101",
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

  @ApiPropertyOptional({
    description: "Operational regions",
    example: ["Gauteng", "Western Cape", "KwaZulu-Natal"],
    type: [String],
  })
  @OptionalStringArray()
  operationalRegions?: string[];

  @ApiPropertyOptional({
    description: "Industry type",
    example: "Manufacturing",
  })
  @OptionalString({ maxLength: 100 })
  industryType?: string;

  @ApiPropertyOptional({
    description: "Company size category",
    example: "medium",
  })
  @OptionalIn(COMPANY_SIZE_VALUES)
  companySize?: string;

  @ApiPropertyOptional({
    description: "BEE Level (1-8)",
    example: 3,
  })
  @OptionalInt({ min: 1, max: 8 })
  beeLevel?: number;

  @ApiPropertyOptional({
    description: "BEE Certificate expiry date",
    example: "2025-12-31",
  })
  @OptionalDateString()
  beeCertificateExpiry?: string;

  @ApiPropertyOptional({
    description: "BEE Verification agency name",
    example: "Empowerdex",
  })
  @OptionalString({ maxLength: 255 })
  beeVerificationAgency?: string;

  @ApiPropertyOptional({
    description: "Whether company is an exempt micro enterprise (EME)",
    example: false,
  })
  @OptionalBoolean()
  isExemptMicroEnterprise?: boolean;
}
