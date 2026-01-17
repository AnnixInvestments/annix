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
}
