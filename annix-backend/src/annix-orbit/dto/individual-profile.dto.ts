import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
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
