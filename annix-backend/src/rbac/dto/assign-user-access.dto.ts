import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export class AssignUserAccessDto {
  @ApiProperty({ description: "App code to grant access to", example: "rfq-platform" })
  @IsString()
  appCode: string;

  @ApiPropertyOptional({
    description: "Role code to assign (null if using custom permissions)",
    example: "editor",
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.useCustomPermissions)
  roleCode?: string | null;

  @ApiPropertyOptional({
    description: "Whether to use custom permissions instead of a role",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  useCustomPermissions?: boolean;

  @ApiPropertyOptional({
    description: "Permission codes when using custom permissions",
    example: ["rfq:view", "rfq:create"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ValidateIf((o) => o.useCustomPermissions === true)
  permissionCodes?: string[];

  @ApiPropertyOptional({
    description: "When access expires (null = never)",
    example: "2025-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class UpdateUserAccessDto {
  @ApiPropertyOptional({
    description: "Role code to assign (null if using custom permissions)",
    example: "manager",
  })
  @IsOptional()
  @IsString()
  roleCode?: string | null;

  @ApiPropertyOptional({
    description: "Whether to use custom permissions instead of a role",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  useCustomPermissions?: boolean;

  @ApiPropertyOptional({
    description: "Permission codes when using custom permissions",
    example: ["rfq:view", "rfq:edit", "boq:view"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];

  @ApiPropertyOptional({
    description: "When access expires (null = never)",
    example: "2025-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class UserAccessResponseDto {
  @ApiProperty({ description: "Access record ID", example: 1 })
  id: number;

  @ApiProperty({ description: "User ID", example: 42 })
  userId: number;

  @ApiProperty({ description: "User email", example: "john@example.com" })
  email: string;

  @ApiPropertyOptional({ description: "User first name", example: "John" })
  firstName: string | null;

  @ApiPropertyOptional({ description: "User last name", example: "Doe" })
  lastName: string | null;

  @ApiProperty({ description: "App code", example: "rfq-platform" })
  appCode: string;

  @ApiPropertyOptional({ description: "Assigned role code", example: "editor" })
  roleCode: string | null;

  @ApiPropertyOptional({ description: "Assigned role name", example: "Editor" })
  roleName: string | null;

  @ApiProperty({ description: "Using custom permissions", example: false })
  useCustomPermissions: boolean;

  @ApiPropertyOptional({
    description: "Custom permission codes (when useCustomPermissions is true)",
    example: ["rfq:view", "rfq:create"],
  })
  permissionCodes: string[] | null;

  @ApiPropertyOptional({ description: "Permission count for custom permissions", example: 3 })
  permissionCount: number | null;

  @ApiProperty({ description: "When access was granted" })
  grantedAt: Date;

  @ApiPropertyOptional({ description: "When access expires" })
  expiresAt: Date | null;

  @ApiPropertyOptional({ description: "ID of user who granted access", example: 1 })
  grantedById: number | null;
}
