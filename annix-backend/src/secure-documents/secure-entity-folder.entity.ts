import { ApiProperty } from "@nestjs/swagger";
export type EntityType = "customer" | "supplier";

export class SecureEntityFolder {
  @ApiProperty({ description: "Primary key" })
  id: number;

  @ApiProperty({
    description: "Type of entity (customer or supplier)",
    enum: ["customer", "supplier"],
    example: "customer",
  })
  entityType: EntityType;

  @ApiProperty({
    description: "ID of the customer or supplier",
    example: 5,
  })
  entityId: number;

  @ApiProperty({
    description: "Display name for the folder",
    example: "Acme Corp (ID: 5)",
  })
  folderName: string;

  @ApiProperty({
    description: "Full path in secure documents structure",
    example: "Customers/Acme Corp (ID: 5)",
  })
  secureFolderPath: string;

  @ApiProperty({
    description: "Whether the folder is active (visible to admins)",
    example: true,
  })
  isActive: boolean;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @ApiProperty({
    description: "Timestamp when folder was deactivated",
    example: null,
  })
  deletedAt: Date | null;

  @ApiProperty({
    description: "Reason for deactivation",
    example: "Account suspended: Non-payment",
  })
  deletionReason: string | null;
}
