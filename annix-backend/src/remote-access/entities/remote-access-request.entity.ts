import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
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

@Entity("remote_access_requests")
@Index(["documentType", "documentId"])
@Index(["status"])
@Index(["expiresAt"])
export class RemoteAccessRequest {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: "Type of access requested",
    enum: RemoteAccessRequestType,
  })
  @Column({
    name: "request_type",
    type: "enum",
    enum: RemoteAccessRequestType,
  })
  requestType: RemoteAccessRequestType;

  @ApiProperty({
    description: "Type of document being accessed",
    enum: RemoteAccessDocumentType,
  })
  @Column({
    name: "document_type",
    type: "enum",
    enum: RemoteAccessDocumentType,
  })
  documentType: RemoteAccessDocumentType;

  @ApiProperty({ description: "ID of the document being accessed", example: 1 })
  @Column({ name: "document_id" })
  documentId: number;

  @ApiProperty({
    description: "Admin user who requested access",
    type: () => User,
  })
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "requested_by_id" })
  requestedBy: User;

  @ApiProperty({
    description: "Customer/Supplier who owns the document",
    type: () => User,
  })
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "document_owner_id" })
  documentOwner: User;

  @ApiProperty({
    description: "Current status of the access request",
    enum: RemoteAccessStatus,
  })
  @Column({
    name: "status",
    type: "enum",
    enum: RemoteAccessStatus,
    default: RemoteAccessStatus.PENDING,
  })
  status: RemoteAccessStatus;

  @ApiProperty({ description: "When the access was requested" })
  @CreateDateColumn({ name: "requested_at" })
  requestedAt: Date;

  @ApiProperty({
    description: "When the document owner responded",
    required: false,
  })
  @Column({ name: "responded_at", type: "timestamp", nullable: true })
  respondedAt: Date | null;

  @ApiProperty({ description: "When the request expires" })
  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @ApiProperty({
    description: "Optional message from the admin",
    required: false,
  })
  @Column({ name: "message", type: "text", nullable: true })
  message: string | null;

  @ApiProperty({
    description: "Reason for denial (if denied)",
    required: false,
  })
  @Column({ name: "denial_reason", type: "text", nullable: true })
  denialReason: string | null;

  @ApiProperty({ description: "When the record was last updated" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
