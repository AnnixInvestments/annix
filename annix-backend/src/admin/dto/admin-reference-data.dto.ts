import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class ReferenceDataQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ReferenceDataModuleInfo {
  @ApiProperty()
  entityName: string;

  @ApiProperty()
  tableName: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  columnCount: number;

  @ApiProperty()
  recordCount: number;
}

export class ColumnSchema {
  @ApiProperty()
  propertyName: string;

  @ApiProperty()
  databaseName: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  nullable: boolean;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  isGenerated: boolean;
}

export class RelationSchema {
  @ApiProperty()
  propertyName: string;

  @ApiProperty()
  relationType: string;

  @ApiProperty()
  targetEntityName: string;

  @ApiPropertyOptional()
  joinColumnName?: string;
}

export class EntitySchemaResponse {
  @ApiProperty({ type: [ColumnSchema] })
  columns: ColumnSchema[];

  @ApiProperty({ type: [RelationSchema] })
  relations: RelationSchema[];
}

export class PaginatedReferenceDataResponse {
  @ApiProperty()
  items: Record<string, any>[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
