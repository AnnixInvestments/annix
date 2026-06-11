import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class InviteAppGrantDto {
  @ApiProperty({ description: "App code to grant access to", example: "rfq-platform" })
  @IsString()
  appCode: string;

  @ApiPropertyOptional({ description: "Role code to assign", example: "viewer" })
  @IsOptional()
  @IsString()
  roleCode?: string | null;

  @ApiPropertyOptional({ description: "Use custom permissions instead of a role" })
  @IsOptional()
  @IsBoolean()
  useCustomPermissions?: boolean;

  @ApiPropertyOptional({ description: "Permission codes when using custom permissions" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];

  @ApiPropertyOptional({ description: "When access expires (null = never)" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class InviteUserDto {
  @ApiProperty({
    description: "Email address of user to invite",
    example: "newuser@example.com",
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: "First name of the user",
    example: "Jane",
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: "Last name of the user",
    example: "Smith",
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: "Apps to grant access to (multi-app invite). Preferred over appCode.",
    type: [InviteAppGrantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteAppGrantDto)
  apps?: InviteAppGrantDto[];

  @ApiPropertyOptional({
    description: "Single app code to grant access to (legacy; use apps[] instead)",
    example: "rfq-platform",
  })
  @ValidateIf((o) => !o.apps || o.apps.length === 0)
  @IsString()
  appCode?: string;

  @ApiPropertyOptional({
    description: "Role code to assign (null if using custom permissions)",
    example: "viewer",
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
    example: ["rfq:view"],
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

export class InviteUserResponseDto {
  @ApiProperty({ description: "User ID", example: 99 })
  userId: number;

  @ApiProperty({ description: "User email", example: "newuser@example.com" })
  email: string;

  @ApiProperty({ description: "Access record ID", example: 1 })
  accessId: number;

  @ApiProperty({ description: "Whether this is a new user", example: true })
  isNewUser: boolean;

  @ApiPropertyOptional({
    description: "Names of the apps access was granted to",
    example: ["RFQ Platform", "Stock Control"],
  })
  appNames?: string[];

  @ApiPropertyOptional({ description: "Whether the invitation email was sent", example: true })
  emailSent?: boolean;

  @ApiProperty({
    description: "Message describing the result",
    example: "User invited and granted access to RFQ Platform",
  })
  message: string;
}
