import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSecureDocumentDto {
  @ApiProperty({ example: 'Fly Deployment Technical Docs' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Neon DB, Fly.io credentials', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '# Deployment Guide\n\nServer credentials...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'deployment/aws', required: false })
  @IsString()
  @IsOptional()
  folder?: string;

  @ApiProperty({ example: 'excel', required: false, enum: ['markdown', 'pdf', 'excel', 'word', 'other'] })
  @IsString()
  @IsOptional()
  fileType?: string;

  @ApiProperty({ example: 'report.xlsx', required: false })
  @IsString()
  @IsOptional()
  originalFilename?: string;

  @ApiProperty({ example: 'secure-documents/attachments/abc123.xlsx', required: false })
  @IsString()
  @IsOptional()
  attachmentPath?: string;
}
