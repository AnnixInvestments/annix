import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";

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

  @IsOptional()
  @IsObject()
  autoPlanSnapshot?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  suggestionTrainingId?: number | null;

  @IsOptional()
  @IsString()
  suggestionOutcome?: "applied" | "applied_modified" | "ignored" | null;

  @IsOptional()
  @IsString()
  reviewedBy?: string | null;

  @IsOptional()
  @IsString()
  reviewedAt?: string | null;
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

export class RubberOffcutReturnItem {
  @IsNumber()
  @Min(1)
  widthMm: number;

  @IsNumber()
  @Min(1)
  lengthMm: number;

  @IsNumber()
  @Min(0)
  thicknessMm: number;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsString()
  rollNumber?: string | null;
}

export class ReturnRubberOffcutsDto {
  @IsArray()
  offcuts: RubberOffcutReturnItem[];
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

  @IsOptional()
  @IsString()
  extractedDescription?: string;
}

export class ConfirmCpoImportDto {
  @IsArray()
  rows: any[];
}

export class AddCpoItemDto {
  @IsOptional()
  @IsString()
  itemCode?: string | null;

  @IsOptional()
  @IsString()
  itemDescription?: string | null;

  @IsOptional()
  @IsString()
  itemNo?: string | null;

  @IsNumber()
  @Min(0)
  quantityOrdered: number;

  @IsOptional()
  @IsString()
  jtNo?: string | null;

  @IsOptional()
  @IsNumber()
  m2?: number | null;
}

export class UpdateCpoItemDto {
  @IsOptional()
  @IsString()
  itemCode?: string | null;

  @IsOptional()
  @IsString()
  itemDescription?: string | null;

  @IsOptional()
  @IsString()
  itemNo?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityOrdered?: number;

  @IsOptional()
  @IsString()
  jtNo?: string | null;

  @IsOptional()
  @IsNumber()
  m2?: number | null;
}

export class UpdateCalloffStatusDto {
  @IsString()
  status: string;
}

export class UpdateCpoStatusDto {
  @IsString()
  status: string;
}

export class UpdateCpoDetailsDto {
  @IsOptional()
  @IsString()
  coatingSpecs?: string | null;
}

export class ConfirmSageJcDumpDto {
  @IsNumber()
  cpoId: number;

  @IsObject()
  jtGroups: Record<string, any[]>;

  @IsArray()
  asteriskAllocations: Array<{
    cpoItemId: number;
    allocations: Array<{ jtNumber: string; quantity: number }>;
  }>;
}

export class RecordRequisitionReceiptDto {
  @IsNumber()
  @Min(1)
  quantityReceived: number;

  @IsOptional()
  @IsNumber()
  deliveryNoteId?: number | null;
}
