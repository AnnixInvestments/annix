import { ApiProperty } from "@nestjs/swagger";

export class AppAccessSummaryDto {
  @ApiProperty({ description: "App code", example: "rfq-platform" })
  appCode: string;

  @ApiProperty({ description: "App display name", example: "RFQ Platform" })
  appName: string;

  @ApiProperty({ description: "Role code", example: "viewer", nullable: true })
  roleCode: string | null;

  @ApiProperty({ description: "Role display name", example: "Viewer", nullable: true })
  roleName: string | null;

  @ApiProperty({ description: "Whether user has custom permissions instead of a role" })
  useCustomPermissions: boolean;

  @ApiProperty({ description: "Custom permission codes", nullable: true })
  permissionCodes: string[] | null;

  @ApiProperty({ description: "Number of custom permissions if using custom", nullable: true })
  permissionCount: number | null;

  @ApiProperty({ description: "Access expiration date", nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ description: "User app access record ID" })
  accessId: number;

  @ApiProperty({ description: "Product keys enabled for this user", nullable: true })
  productKeys: string[] | null;
}

export class UserWithAccessSummaryDto {
  @ApiProperty({ description: "User ID", example: 1 })
  id: number;

  @ApiProperty({ description: "User email", example: "user@example.com" })
  email: string;

  @ApiProperty({ description: "User first name", nullable: true })
  firstName: string | null;

  @ApiProperty({ description: "User last name", nullable: true })
  lastName: string | null;

  @ApiProperty({ description: "User account status", example: "active" })
  status: string;

  @ApiProperty({ description: "Last login timestamp", nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ description: "Account creation timestamp" })
  createdAt: Date;

  @ApiProperty({
    description: "Summary of app access for this user",
    type: [AppAccessSummaryDto],
  })
  appAccess: AppAccessSummaryDto[];
}
