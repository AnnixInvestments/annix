import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { CustomFieldType } from "../entities";

export class CreateCustomFieldDto {
  @ApiProperty({ description: "Display name for the field", example: "Industry" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: "Unique key for the field (lowercase, underscores)",
    example: "industry",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message:
      "Field key must start with a letter and contain only lowercase letters, numbers, and underscores",
  })
  fieldKey: string;

  @ApiPropertyOptional({
    description: "Type of the field",
    enum: CustomFieldType,
    default: CustomFieldType.TEXT,
  })
  @IsEnum(CustomFieldType)
  @IsOptional()
  fieldType?: CustomFieldType;

  @ApiPropertyOptional({ description: "Whether the field is required", default: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: "Options for select/multiselect fields",
    example: ["Option 1", "Option 2"],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional({ description: "Display order for the field", default: 0 })
  @IsNumber()
  @IsOptional()
  displayOrder?: number;
}

export class UpdateCustomFieldDto extends PartialType(CreateCustomFieldDto) {
  @ApiPropertyOptional({ description: "Whether the field is active" })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CustomFieldResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  fieldKey: string;

  @ApiProperty({ enum: CustomFieldType })
  fieldType: CustomFieldType;

  @ApiProperty()
  isRequired: boolean;

  @ApiPropertyOptional()
  options: string[] | null;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
