import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ConversationType, RelatedEntityType } from "../entities";

export class CreateConversationDto {
  @ApiProperty({
    description: "Conversation subject",
    example: "Question about RFQ-2025-001",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @ApiPropertyOptional({
    description: "Type of conversation",
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  @IsEnum(ConversationType)
  @IsOptional()
  conversationType?: ConversationType;

  @ApiPropertyOptional({
    description: "Type of related entity",
    enum: RelatedEntityType,
  })
  @IsEnum(RelatedEntityType)
  @IsOptional()
  relatedEntityType?: RelatedEntityType;

  @ApiPropertyOptional({
    description: "ID of related entity (RFQ or BOQ)",
    example: 123,
  })
  @IsNumber()
  @IsOptional()
  relatedEntityId?: number;

  @ApiProperty({
    description: "User IDs to add as participants",
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  participantIds: number[];

  @ApiPropertyOptional({
    description: "Initial message content",
    example: "Hello, I have a question about the pricing...",
  })
  @IsString()
  @IsOptional()
  initialMessage?: string;
}

export class ConversationFilterDto {
  @ApiPropertyOptional({
    description: "Filter by archived status",
    example: false,
  })
  @IsOptional()
  isArchived?: boolean;

  @ApiPropertyOptional({
    description: "Filter by related entity type",
    enum: RelatedEntityType,
  })
  @IsEnum(RelatedEntityType)
  @IsOptional()
  relatedEntityType?: RelatedEntityType;

  @ApiPropertyOptional({
    description: "Filter by related entity ID",
    example: 123,
  })
  @IsNumber()
  @IsOptional()
  relatedEntityId?: number;

  @ApiPropertyOptional({
    description: "Page number",
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 20,
    default: 20,
  })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class ConversationSummaryDto {
  @ApiProperty({ description: "Conversation ID" })
  id: number;

  @ApiProperty({ description: "Subject" })
  subject: string;

  @ApiProperty({ description: "Conversation type" })
  conversationType: ConversationType;

  @ApiProperty({ description: "Related entity type" })
  relatedEntityType: RelatedEntityType;

  @ApiPropertyOptional({ description: "Related entity ID" })
  relatedEntityId: number | null;

  @ApiProperty({ description: "Unread message count" })
  unreadCount: number;

  @ApiPropertyOptional({ description: "Last message preview" })
  lastMessagePreview: string | null;

  @ApiPropertyOptional({ description: "Last message timestamp" })
  lastMessageAt: Date | null;

  @ApiProperty({ description: "Participant names" })
  participantNames: string[];

  @ApiProperty({ description: "Is archived" })
  isArchived: boolean;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;
}

export class ConversationDetailDto extends ConversationSummaryDto {
  @ApiProperty({ description: "Participants" })
  participants: ParticipantDto[];

  @ApiProperty({ description: "Messages" })
  messages: MessageDto[];
}

export class ParticipantDto {
  @ApiProperty({ description: "Participant ID" })
  id: number;

  @ApiProperty({ description: "User ID" })
  userId: number;

  @ApiProperty({ description: "User name" })
  name: string;

  @ApiProperty({ description: "User email" })
  email: string;

  @ApiProperty({ description: "Role in conversation" })
  role: string;

  @ApiProperty({ description: "Is active" })
  isActive: boolean;

  @ApiPropertyOptional({ description: "Last read timestamp" })
  lastReadAt: Date | null;
}

export class MessageDto {
  @ApiProperty({ description: "Message ID" })
  id: number;

  @ApiProperty({ description: "Sender ID" })
  senderId: number;

  @ApiProperty({ description: "Sender name" })
  senderName: string;

  @ApiProperty({ description: "Message content" })
  content: string;

  @ApiProperty({ description: "Message type" })
  messageType: string;

  @ApiPropertyOptional({ description: "Parent message ID" })
  parentMessageId: number | null;

  @ApiProperty({ description: "Sent timestamp" })
  sentAt: Date;

  @ApiPropertyOptional({ description: "Edited timestamp" })
  editedAt: Date | null;

  @ApiProperty({ description: "Is deleted" })
  isDeleted: boolean;

  @ApiProperty({ description: "Attachments" })
  attachments: AttachmentDto[];

  @ApiProperty({ description: "Read by user IDs" })
  readByUserIds: number[];
}

export class AttachmentDto {
  @ApiProperty({ description: "Attachment ID" })
  id: number;

  @ApiProperty({ description: "File name" })
  fileName: string;

  @ApiProperty({ description: "File size in bytes" })
  fileSize: number;

  @ApiProperty({ description: "MIME type" })
  mimeType: string;

  @ApiProperty({ description: "Download URL" })
  downloadUrl: string;
}
