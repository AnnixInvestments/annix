import { ApiProperty } from "@nestjs/swagger";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { User } from "../../user/entities/user.entity";
import { DrawingComment } from "./drawing-comment.entity";
import { DrawingVersion } from "./drawing-version.entity";

export enum DrawingFileType {
  PDF = "pdf",
  DWG = "dwg",
  DXF = "dxf",
  PNG = "png",
  JPG = "jpg",
  JPEG = "jpeg",
}

export enum DrawingStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  CHANGES_REQUESTED = "changes_requested",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export class Drawing {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Auto-generated drawing number",
    example: "DRW-2025-0001",
  })
  drawingNumber: string;

  @ApiProperty({
    description: "Drawing title",
    example: "Pipeline Section A - General Arrangement",
  })
  title: string;

  @ApiProperty({ description: "Drawing description", required: false })
  description?: string;

  @ApiProperty({ description: "File type", enum: DrawingFileType })
  fileType: DrawingFileType;

  @ApiProperty({ description: "File path in storage" })
  filePath: string;

  @ApiProperty({ description: "Original filename" })
  originalFilename: string;

  @ApiProperty({ description: "File size in bytes", example: 1024000 })
  fileSizeBytes: number;

  @ApiProperty({ description: "MIME type", example: "application/pdf" })
  mimeType: string;

  @ApiProperty({ description: "Current version number", example: 1 })
  currentVersion: number;

  @ApiProperty({ description: "Drawing status", enum: DrawingStatus })
  status: DrawingStatus;

  @ApiProperty({
    description: "Associated RFQ",
    type: () => Rfq,
    required: false,
  })
  rfq?: Rfq;

  @ApiProperty({
    description: "User who uploaded the drawing",
    type: () => User,
  })
  uploadedBy: User;

  @ApiProperty({ description: "Version history", type: () => [DrawingVersion] })
  versions: DrawingVersion[];

  @ApiProperty({
    description: "Comments on the drawing",
    type: () => [DrawingComment],
  })
  comments: DrawingComment[];

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
