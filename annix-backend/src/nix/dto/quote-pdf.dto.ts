import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class QuotePdfItemRowDto {
  @ApiProperty()
  @IsString()
  mark: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitPrice: number;

  @ApiProperty()
  @IsNumber()
  lineExcl: number;

  @ApiProperty()
  @IsNumber()
  lineTax: number;

  @ApiProperty()
  @IsNumber()
  lineIncl: number;
}

export class QuotePdfPoolDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  coatingLine: string | null;

  @ApiProperty({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  liningLine: string | null;

  @ApiProperty()
  @IsString()
  note: string;

  @ApiProperty({ type: [QuotePdfItemRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotePdfItemRowDto)
  items: QuotePdfItemRowDto[];
}

export class QuotePdfSnapshotDto {
  @ApiProperty({ type: [QuotePdfPoolDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotePdfPoolDto)
  pools: QuotePdfPoolDto[];

  @ApiProperty()
  @IsString()
  generalNotes: string;

  @ApiProperty()
  @IsNumber()
  subtotalExcl: number;

  @ApiProperty()
  @IsNumber()
  totalTax: number;

  @ApiProperty()
  @IsNumber()
  totalIncl: number;
}
