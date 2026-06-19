import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";

export enum RemoteAccessRequestType {
  VIEW = "VIEW",
  EDIT = "EDIT",
}

export enum RemoteAccessDocumentType {
  RFQ = "RFQ",
  BOQ = "BOQ",
}

export enum RemoteAccessStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DENIED = "DENIED",
  EXPIRED = "EXPIRED",
}

export class RemoteAccessRequest {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Type of access requested",
    enum: RemoteAccessRequestType,
  })
  requestType: RemoteAccessRequestType;

  @ApiProperty({
    description: "Type of document being accessed",
    enum: RemoteAccessDocumentType,
  })
  documentType: RemoteAccessDocumentType;

  @ApiProperty({ description: "ID of the document being accessed", example: 1 })
  documentId: number;

  @ApiProperty({
    description: "Admin user who requested access",
    type: () => User,
  })
  requestedBy: User;

  @ApiProperty({
    description: "Customer/Supplier who owns the document",
    type: () => User,
  })
  documentOwner: User;

  @ApiProperty({
    description: "Current status of the access request",
    enum: RemoteAccessStatus,
  })
  status: RemoteAccessStatus;

  @ApiProperty({ description: "When the access was requested" })
  requestedAt: Date;

  @ApiProperty({
    description: "When the document owner responded",
    required: false,
  })
  respondedAt: Date | null;

  @ApiProperty({ description: "When the request expires" })
  expiresAt: Date;

  @ApiProperty({
    description: "Optional message from the admin",
    required: false,
  })
  message: string | null;

  @ApiProperty({
    description: "Reason for denial (if denied)",
    required: false,
  })
  denialReason: string | null;

  @ApiProperty({ description: "When the record was last updated" })
  updatedAt: Date;
}
