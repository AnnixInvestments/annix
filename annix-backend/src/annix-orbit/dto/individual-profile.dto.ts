import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import {
  OptionalBoolean,
  OptionalInt,
  OptionalString,
  RequiredBoolean,
} from "../../lib/dto/validation-decorators";
import { IndividualDocumentKind } from "../entities/annix-orbit-individual-document.entity";

export class UploadIndividualDocumentDto {
  @IsEnum(IndividualDocumentKind)
  kind: IndividualDocumentKind;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @IsIn(["upload", "photo"])
  @IsOptional()
  source?: "upload" | "photo";
}

export class UpdateCredentialFieldsDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  credentialName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  issuer?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  dateAwarded?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  nqfLevel?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  expiry?: string;
}

export class UpdateSeekerPreferencesDto {
  @OptionalString({ maxLength: 32 })
  phoneType?: string;

  @OptionalBoolean()
  appGuideSeen?: boolean;

  @OptionalString({ maxLength: 32 })
  ageGroup?: string;
}

export class SetPhotoVisibilityDto {
  @RequiredBoolean()
  visible: boolean;
}

export class UpdateNotificationPreferencesDto {
  @OptionalInt({ min: 0, max: 100 })
  matchAlertThreshold?: number;

  @OptionalBoolean()
  digestEnabled?: boolean;

  @OptionalBoolean()
  pushEnabled?: boolean;
}
