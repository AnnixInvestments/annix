import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { COMPANY_SIZE_VALUES } from "../../lib/dto/common-company.dto";
import {
  OptionalEmail,
  OptionalIn,
  OptionalInt,
  OptionalPhone,
  OptionalString,
} from "../../lib/dto/validation-decorators";
import { SA_PROVINCES } from "./auth.dto";

export class UpdateImapSettingsDto {
  @IsString()
  @IsOptional()
  imapHost?: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  imapPort?: number;

  @IsString()
  @IsOptional()
  imapUser?: string;

  @IsString()
  @IsOptional()
  imapPassword?: string;

  @IsBoolean()
  @IsOptional()
  monitoringEnabled?: boolean;

  @IsString()
  @IsOptional()
  emailFromAddress?: string;
}

export class UpdateCompanyDto {
  @OptionalString({ maxLength: 255 })
  name?: string;

  @OptionalString({ maxLength: 100 })
  industry?: string;

  @OptionalIn(COMPANY_SIZE_VALUES)
  companySize?: string;

  @OptionalIn(SA_PROVINCES)
  province?: string;

  @OptionalString({ maxLength: 100 })
  city?: string;

  @OptionalString({ maxLength: 500 })
  streetAddress?: string;

  @OptionalString({ maxLength: 10 })
  postalCode?: string;

  @OptionalPhone()
  phone?: string;

  @OptionalEmail({ maxLength: 255 })
  contactEmail?: string;

  @OptionalString({ maxLength: 500 })
  websiteUrl?: string;

  @OptionalString({ maxLength: 50 })
  registrationNumber?: string;

  @OptionalString({ maxLength: 50 })
  vatNumber?: string;

  @OptionalInt({ min: 1, max: 8 })
  beeLevel?: number;
}
