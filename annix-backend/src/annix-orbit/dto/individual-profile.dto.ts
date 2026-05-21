import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { IndividualDocumentKind } from "../entities/annix-orbit-individual-document.entity";

export class UploadIndividualDocumentDto {
  @IsEnum(IndividualDocumentKind)
  kind: IndividualDocumentKind;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;
}
