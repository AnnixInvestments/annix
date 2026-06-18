import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";

export type BroadcastSendMode = "freeform" | "template";

export class BroadcastSendOneDto {
  @IsInt()
  userId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  message: string;

  @IsIn(["freeform", "template"])
  mode: BroadcastSendMode;

  @ValidateIf((dto: BroadcastSendOneDto) => dto.mode === "template")
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  templateName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  languageCode?: string;
}
