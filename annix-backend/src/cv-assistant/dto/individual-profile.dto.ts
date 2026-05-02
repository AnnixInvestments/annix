import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { IndividualDocumentKind } from "../entities/cv-assistant-individual-document.entity";

export class UploadIndividualDocumentDto {
  @IsEnum(IndividualDocumentKind)
  kind: IndividualDocumentKind;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;
}
