import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateInvoiceDto {
  @IsNumber()
  deliveryNoteId: number;

  @IsString()
  invoiceNumber: string;

  @IsString()
  supplierName: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vatAmount?: number;
}

export class SubmitClarificationDto {
  @IsOptional()
  @IsNumber()
  selectedStockItemId?: number;

  @IsOptional()
  createNewItem?: {
    sku: string;
    name: string;
    description?: string;
    category?: string;
    unitOfMeasure?: string;
  };

  @IsOptional()
  skipPriceUpdate?: boolean;

  @IsOptional()
  confirmed?: boolean;
}

export class ManualMatchDto {
  @IsNumber()
  stockItemId: number;
}
