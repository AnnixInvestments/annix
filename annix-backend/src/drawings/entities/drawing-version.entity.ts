import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";
import { Drawing } from "./drawing.entity";

export class DrawingVersion {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Parent drawing", type: () => Drawing })
  drawing: Drawing;

  @ApiProperty({ description: "Version number", example: 1 })
  versionNumber: number;

  @ApiProperty({ description: "File path in storage" })
  filePath: string;

  @ApiProperty({ description: "Original filename" })
  originalFilename: string;

  @ApiProperty({ description: "File size in bytes", example: 1024000 })
  fileSizeBytes: number;

  @ApiProperty({
    description: "Change notes for this version",
    required: false,
  })
  changeNotes?: string;

  @ApiProperty({
    description: "User who uploaded this version",
    type: () => User,
  })
  uploadedBy: User;

  @ApiProperty({ description: "Upload date" })
  createdAt: Date;
}
