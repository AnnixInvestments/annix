import { ApiProperty } from "@nestjs/swagger";
import { User } from "../user/entities/user.entity";

export class SecureDocument {
  @ApiProperty({
    description: "Primary key (UUID)",
    example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  })
  id: string;

  @ApiProperty({
    description: "URL-friendly slug",
    example: "fly-deployment-technical-docs",
  })
  slug: string;

  @ApiProperty({
    description: "Document title",
    example: "Fly Deployment Technical Docs",
  })
  title: string;

  @ApiProperty({
    description: "Brief description for listing",
    example: "Neon DB, Fly.io credentials",
  })
  description: string;

  @ApiProperty({ description: "S3 path to encrypted content file" })
  storagePath: string;

  @ApiProperty({
    description: "Type of document",
    example: "markdown",
    enum: ["markdown", "pdf", "excel", "word", "other"],
  })
  fileType: string;

  @ApiProperty({
    description: "Original filename for binary uploads",
    example: "deployment-guide.pdf",
  })
  originalFilename: string | null;

  @ApiProperty({
    description: "Folder path for organizing documents",
    example: "deployment/aws",
  })
  folder: string | null;

  @ApiProperty({
    description: "S3 path to original attachment file (for non-processed uploads)",
    example: "secure-documents/attachments/abc123.xlsx",
  })
  attachmentPath: string | null;

  @ApiProperty({ description: "User who created the document" })
  createdBy: User;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;
}
