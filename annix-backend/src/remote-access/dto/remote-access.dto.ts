import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import {
  RemoteAccessRequestType,
  RemoteAccessDocumentType,
  RemoteAccessStatus,
} from '../entities/remote-access-request.entity';

export class CreateRemoteAccessRequestDto {
  @ApiProperty({
    description: 'Type of access requested',
    enum: RemoteAccessRequestType,
    example: RemoteAccessRequestType.VIEW,
  })
  @IsEnum(RemoteAccessRequestType)
  requestType: RemoteAccessRequestType;

  @ApiProperty({
    description: 'Type of document to access',
    enum: RemoteAccessDocumentType,
    example: RemoteAccessDocumentType.RFQ,
  })
  @IsEnum(RemoteAccessDocumentType)
  documentType: RemoteAccessDocumentType;

  @ApiProperty({
    description: 'ID of the document to access',
    example: 1,
  })
  @IsInt()
  documentId: number;

  @ApiPropertyOptional({
    description: 'Optional message to the document owner',
    example: 'I need to review the specifications for quality assurance.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class RespondToAccessRequestDto {
  @ApiProperty({
    description: 'Whether to approve the request',
    example: true,
  })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({
    description: 'Reason for denial (required if not approved)',
    example: 'This document contains confidential pricing information.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  denialReason?: string;
}

export class RemoteAccessRequestResponseDto {
  @ApiProperty({ description: 'Request ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Type of access requested',
    enum: RemoteAccessRequestType,
  })
  requestType: RemoteAccessRequestType;

  @ApiProperty({
    description: 'Type of document',
    enum: RemoteAccessDocumentType,
  })
  documentType: RemoteAccessDocumentType;

  @ApiProperty({ description: 'Document ID', example: 1 })
  documentId: number;

  @ApiProperty({
    description: 'Current status',
    enum: RemoteAccessStatus,
  })
  status: RemoteAccessStatus;

  @ApiPropertyOptional({ description: 'Admin message' })
  message?: string;

  @ApiProperty({ description: 'When the request was made' })
  requestedAt: Date;

  @ApiPropertyOptional({ description: 'When it expires' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'When owner responded' })
  respondedAt?: Date;

  @ApiPropertyOptional({ description: 'Admin who requested' })
  requestedBy?: {
    id: number;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Document owner' })
  documentOwner?: {
    id: number;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Document details' })
  document?: {
    id: number;
    name: string;
    type: string;
  };
}

export class PendingAccessRequestsResponseDto {
  @ApiProperty({
    description: 'List of pending access requests',
    type: [RemoteAccessRequestResponseDto],
  })
  requests: RemoteAccessRequestResponseDto[];

  @ApiProperty({ description: 'Total count of pending requests', example: 3 })
  count: number;
}

export class AccessStatusResponseDto {
  @ApiProperty({
    description: 'Whether access is granted',
    example: true,
  })
  hasAccess: boolean;

  @ApiProperty({
    description: 'Current request status',
    enum: RemoteAccessStatus,
  })
  status: RemoteAccessStatus;

  @ApiPropertyOptional({
    description: 'Request ID if exists',
    example: 1,
  })
  requestId?: number;

  @ApiPropertyOptional({
    description: 'When access expires',
  })
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Message from the request',
  })
  message?: string;
}
