import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadRfqDocumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The document file to upload (max 50MB)'
  })
  file: Express.Multer.File;

  @ApiProperty({ description: 'Optional description of the document', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class RfqDocumentResponseDto {
  @ApiProperty({ description: 'Document ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'RFQ ID this document belongs to', example: 1 })
  rfqId: number;

  @ApiProperty({ description: 'Original filename', example: 'project-specs.pdf' })
  filename: string;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes', example: 1024000 })
  fileSizeBytes: number;

  @ApiProperty({ description: 'Download URL', example: '/api/rfq/documents/1/download' })
  downloadUrl: string;

  @ApiProperty({ description: 'Username of uploader', required: false, example: 'john_doe' })
  uploadedBy?: string;

  @ApiProperty({ description: 'Upload date', example: '2025-12-21T10:30:00Z' })
  createdAt: Date;
}

export class RfqDocumentsListResponseDto {
  @ApiProperty({ description: 'List of documents', type: [RfqDocumentResponseDto] })
  documents: RfqDocumentResponseDto[];

  @ApiProperty({ description: 'Total number of documents', example: 3 })
  total: number;
}
