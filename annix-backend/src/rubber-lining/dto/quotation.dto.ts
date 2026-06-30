import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class CreateQuotationItemDto {
  @IsString()
  productCode: string;

  @IsString()
  productDescription: string;

  @IsString()
  colour: string;

  @IsNumber()
  thickness: number;

  @IsNumber()
  width: number;

  @IsNumber()
  length: number;

  @IsNumber()
  rollWeight: number;

  @IsNumber()
  pricePerKg: number;

  @IsNumber()
  rollPrice: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  linePriceExVat: number;

  @IsNumber()
  lineVat: number;

  @IsNumber()
  linePriceIncVat: number;
}

export class CreateQuotationDto {
  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerVatNumber?: string;

  @IsOptional()
  @IsString()
  validTo?: string;

  @IsOptional()
  @IsNumber()
  affiliateId?: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  vatTotal: number;

  @IsNumber()
  grandTotal: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];
}

export class UpdateQuotationItemDto {
  @IsOptional()
  @IsString()
  productCode?: string;

  @IsOptional()
  @IsString()
  productDescription?: string;

  @IsOptional()
  @IsString()
  colour?: string;

  @IsOptional()
  @IsNumber()
  thickness?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  length?: number;

  @IsOptional()
  @IsNumber()
  rollWeight?: number;

  @IsOptional()
  @IsNumber()
  pricePerKg?: number;

  @IsOptional()
  @IsNumber()
  rollPrice?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  linePriceExVat?: number;

  @IsOptional()
  @IsNumber()
  lineVat?: number;

  @IsOptional()
  @IsNumber()
  linePriceIncVat?: number;
}

export class UpdateQuotationDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerVatNumber?: string;

  @IsOptional()
  @IsString()
  validTo?: string;

  @IsOptional()
  @IsNumber()
  affiliateId?: number;

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  vatTotal?: number;

  @IsOptional()
  @IsNumber()
  grandTotal?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuotationItemDto)
  items?: UpdateQuotationItemDto[];
}
