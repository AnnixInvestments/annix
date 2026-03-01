import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { RoleTargetType } from "../entities/app-role.entity";

export class CreateRoleDto {
  @ApiProperty({
    description: "Unique code for the role (lowercase, hyphenated)",
    example: "sales-rep",
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: "Human-readable name for the role",
    example: "Sales Representative",
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: "Description of the role",
    example: "Can view and create RFQs but cannot approve",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Whether this is the default role for new users",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: "Target type for the role (CUSTOMER or SUPPLIER). Null/omitted means applicable to both.",
    example: "CUSTOMER",
    enum: RoleTargetType,
  })
  @IsOptional()
  @IsEnum(RoleTargetType)
  targetType?: RoleTargetType | null;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: "Human-readable name for the role",
    example: "Sales Representative",
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: "Description of the role",
    example: "Can view and create RFQs but cannot approve",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Whether this is the default role for new users",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: "Display order for sorting",
    example: 5,
  })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({
    description: "Target type for the role (CUSTOMER or SUPPLIER). Null means applicable to both.",
    example: "CUSTOMER",
    enum: RoleTargetType,
  })
  @IsOptional()
  @IsEnum(RoleTargetType)
  targetType?: RoleTargetType | null;
}

export class SetRoleProductsDto {
  @ApiProperty({
    description: "Product keys the role can access",
    example: ["RFQ_PRODUCT_FABRICATED_STEEL", "RFQ_PRODUCT_FASTENERS"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  productKeys: string[];
}

export class RoleResponseDto {
  @ApiProperty({ description: "Role ID", example: 1 })
  id: number;

  @ApiProperty({ description: "App ID", example: 1 })
  appId: number;

  @ApiProperty({ description: "Role code", example: "sales-rep" })
  code: string;

  @ApiProperty({ description: "Role name", example: "Sales Representative" })
  name: string;

  @ApiPropertyOptional({ description: "Role description" })
  description: string | null;

  @ApiProperty({ description: "Is default role", example: false })
  isDefault: boolean;

  @ApiProperty({ description: "Display order", example: 5 })
  displayOrder: number;

  @ApiPropertyOptional({
    description: "Target type (CUSTOMER or SUPPLIER). Null means applicable to both.",
    enum: RoleTargetType,
  })
  targetType: RoleTargetType | null;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;
}

export class RoleProductsResponseDto {
  @ApiProperty({ description: "Role ID", example: 1 })
  roleId: number;

  @ApiProperty({
    description: "Product keys the role can access",
    example: ["RFQ_PRODUCT_FABRICATED_STEEL", "RFQ_PRODUCT_FASTENERS"],
    type: [String],
  })
  productKeys: string[];
}
