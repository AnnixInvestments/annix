import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class ParsedItemSpecifications {
  @ApiProperty({ description: "Nominal bore diameter in mm", required: false })
  @IsOptional()
  @IsNumber()
  diameter?: number;

  @ApiProperty({ description: "Secondary diameter for reducers in mm", required: false })
  @IsOptional()
  @IsNumber()
  secondaryDiameter?: number;

  @ApiProperty({ description: "Pipe length in meters", required: false })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiProperty({ description: "Schedule number (e.g., Sch 40)", required: false })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiProperty({ description: "Material type", required: false })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiProperty({ description: "Material grade (e.g., ASTM A106 Grade B)", required: false })
  @IsOptional()
  @IsString()
  materialGrade?: string;

  @ApiProperty({ description: "Bend angle in degrees", required: false })
  @IsOptional()
  @IsNumber()
  angle?: number;

  @ApiProperty({ description: "Flange configuration", required: false })
  @IsOptional()
  @IsString()
  flangeConfig?: string;

  @ApiProperty({ description: "Flange rating (e.g., PN16, Class 150)", required: false })
  @IsOptional()
  @IsString()
  flangeRating?: string;

  @ApiProperty({ description: "Quantity", required: false })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiProperty({ description: "Item description", required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ParsedItemDto {
  @ApiProperty({
    description: "Parsed action type",
    enum: ["create_item", "update_item", "delete_item", "question", "validation", "unknown"],
  })
  @IsString()
  action: "create_item" | "update_item" | "delete_item" | "question" | "validation" | "unknown";

  @ApiProperty({
    description: "Item type",
    enum: [
      "pipe",
      "bend",
      "reducer",
      "tee",
      "flange",
      "expansion_joint",
      "valve",
      "instrument",
      "pump",
    ],
    required: false,
  })
  @IsOptional()
  @IsString()
  itemType?:
    | "pipe"
    | "bend"
    | "reducer"
    | "tee"
    | "flange"
    | "expansion_joint"
    | "valve"
    | "instrument"
    | "pump";

  @ApiProperty({ description: "Parsed specifications", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParsedItemSpecifications)
  specifications?: ParsedItemSpecifications;

  @ApiProperty({ description: "Confidence score 0.0-1.0" })
  @IsNumber()
  confidence: number;

  @ApiProperty({ description: "Explanation of what was parsed" })
  @IsString()
  explanation: string;

  @ApiProperty({ description: "Original text that was parsed", required: false })
  @IsOptional()
  @IsString()
  originalText?: string;
}

export class ParseItemsRequestDto {
  @ApiProperty({ description: "User message to parse for items" })
  @IsString()
  message: string;

  @ApiProperty({ description: "Context for parsing", required: false })
  @IsOptional()
  context?: {
    currentItems?: any[];
    recentMessages?: string[];
  };
}

export class ParseItemsResponseDto {
  @ApiProperty({ description: "Session ID" })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ description: "Array of parsed items" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParsedItemDto)
  parsedItems: ParsedItemDto[];

  @ApiProperty({ description: "Whether any items require confirmation" })
  requiresConfirmation: boolean;

  @ApiProperty({ description: "Validation issues for parsed items", required: false })
  @IsOptional()
  validationIssues?: Array<{
    itemIndex: number;
    severity: "error" | "warning" | "info";
    field: string;
    message: string;
    suggestion?: string;
  }>;
}

export class ConfirmItemDto {
  @ApiProperty({ description: "Index of the parsed item" })
  @IsNumber()
  index: number;

  @ApiProperty({ description: "Whether to include this item" })
  confirmed: boolean;

  @ApiProperty({ description: "Modified specifications (if user edited)", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParsedItemSpecifications)
  modifiedSpecs?: ParsedItemSpecifications;
}

export class CreateItemsFromChatDto {
  @ApiProperty({ description: "Parsed items to create" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParsedItemDto)
  items: ParsedItemDto[];

  @ApiProperty({ description: "Confirmation for each item", required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmItemDto)
  confirmations?: ConfirmItemDto[];

  @ApiProperty({ description: "Target RFQ ID (create new if not provided)", required: false })
  @IsOptional()
  @IsNumber()
  rfqId?: number;

  @ApiProperty({ description: "RFQ title for new RFQs", required: false })
  @IsOptional()
  @IsString()
  rfqTitle?: string;
}

export class CreatedItemResultDto {
  @ApiProperty({ description: "Line number in RFQ" })
  @IsNumber()
  lineNumber: number;

  @ApiProperty({ description: "Item type" })
  @IsString()
  itemType: string;

  @ApiProperty({ description: "Item description" })
  @IsString()
  description: string;

  @ApiProperty({ description: "Quantity" })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: "Original parsed index" })
  @IsNumber()
  originalIndex: number;
}

export class CreateItemsResponseDto {
  @ApiProperty({ description: "Whether creation was successful" })
  success: boolean;

  @ApiProperty({ description: "RFQ ID (new or existing)" })
  @IsNumber()
  rfqId: number;

  @ApiProperty({ description: "RFQ number" })
  @IsString()
  rfqNumber: string;

  @ApiProperty({ description: "Number of items created" })
  @IsNumber()
  itemsCreated: number;

  @ApiProperty({ description: "Details of created items" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatedItemResultDto)
  items: CreatedItemResultDto[];

  @ApiProperty({ description: "Any items that failed to create", required: false })
  @IsOptional()
  failedItems?: Array<{
    index: number;
    reason: string;
  }>;
}
