import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateRubberPlanDto {
  @IsIn(["pending", "accepted", "manual"])
  status: "pending" | "accepted" | "manual";

  @IsOptional()
  selectedPlyCombination?: any;

  @IsOptional()
  @IsArray()
  manualRolls?: any[];

  @IsOptional()
  @IsArray()
  dimensionOverrides?: any[];
}

export class MarkOffcutAsWastageDto {
  @IsNumber()
  @Min(0)
  widthMm: number;

  @IsNumber()
  @Min(0)
  lengthMm: number;

  @IsNumber()
  @Min(0)
  thicknessMm: number;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsNumber()
  @Min(0)
  specificGravity: number;
}

export class UploadAmendmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UploadAttachmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRequisitionItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  packSizeLitres?: number;

  @IsOptional()
  @IsNumber()
  reorderQty?: number | null;

  @IsOptional()
  @IsString()
  reqNumber?: string | null;
}

export class UpdateInvoiceItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  unitType?: string;
}

export class ConfirmCpoImportDto {
  @IsArray()
  rows: any[];
}

export class UpdateCalloffStatusDto {
  @IsString()
  status: string;
}

export class UpdateCpoStatusDto {
  @IsString()
  status: string;
}

export class RecordRequisitionReceiptDto {
  @IsNumber()
  @Min(1)
  quantityReceived: number;

  @IsOptional()
  @IsNumber()
  deliveryNoteId?: number | null;
}
