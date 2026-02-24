import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

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

  @ApiProperty({
    description: "App code to grant access to",
    example: "rfq-platform",
  })
  @IsString()
  appCode: string;

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

  @ApiProperty({
    description: "Message describing the result",
    example: "User invited and granted access to RFQ Platform",
  })
  message: string;
}
