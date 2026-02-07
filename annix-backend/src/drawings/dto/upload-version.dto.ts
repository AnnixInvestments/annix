import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UploadVersionDto {
  @ApiPropertyOptional({
    description: "Notes describing what changed in this version",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  changeNotes?: string;
}
