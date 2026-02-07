import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class DirectoryQueryDto {
  @ApiPropertyOptional({ description: "Search by company name" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by province" })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: "Filter by product categories", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  products?: string[];
}

export class BlockSupplierDto {
  @ApiPropertyOptional({ description: "Reason for blocking this supplier" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DirectorySupplierDto {
  @ApiProperty()
  supplierProfileId: number;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  province: string;

  @ApiProperty({ type: [String] })
  products: string[];

  @ApiProperty({ type: [String] })
  productLabels: string[];

  @ApiProperty({ enum: ["preferred", "blocked", "none"] })
  status: "preferred" | "blocked" | "none";

  @ApiPropertyOptional()
  preferredSupplierId?: number;

  @ApiPropertyOptional()
  blockedSupplierId?: number;
}
