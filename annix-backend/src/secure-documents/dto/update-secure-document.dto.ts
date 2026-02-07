import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateSecureDocumentDto {
  @ApiProperty({ example: "Fly Deployment Technical Docs", required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: "Neon DB, Fly.io credentials", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: "# Deployment Guide\n\nServer credentials...",
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ example: "deployment/aws", required: false })
  @IsString()
  @IsOptional()
  folder?: string;
}
