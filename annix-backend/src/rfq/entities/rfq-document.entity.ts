import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";
import { Rfq } from "./rfq.entity";

export class RfqDocument {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Associated RFQ", type: () => Rfq })
  rfq: Rfq;

  @ApiProperty({
    description: "Original filename",
    example: "project-specs.pdf",
  })
  filename: string;

  @ApiProperty({
    description: "Storage path",
    example: "rfq-documents/1/abc123.pdf",
  })
  filePath: string;

  @ApiProperty({ description: "MIME type", example: "application/pdf" })
  mimeType: string;

  @ApiProperty({ description: "File size in bytes", example: 1024000 })
  fileSizeBytes: number;

  @ApiProperty({
    description: "User who uploaded the document",
    type: () => User,
    required: false,
  })
  uploadedBy?: User;

  @ApiProperty({ description: "Upload date" })
  createdAt: Date;
}
