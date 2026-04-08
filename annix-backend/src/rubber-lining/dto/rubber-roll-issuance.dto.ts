import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";
import type { RollIssuanceStatus } from "../entities/rubber-roll-issuance.entity";

export class RollPhotoExtractionDto {
  date: string | null;
  supplier: string | null;
  compoundCode: string | null;
  thicknessMm: number | null;
  widthMm: number | null;
  lengthM: number | null;
  batchNumber: string | null;
  weightKg: number | null;
  confidence: number;
  analysis: string;
}

export class IdentifyRollPhotoDto {
  @IsString()
  imageBase64: string;

  @IsString()
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export class RollPhotoIdentifyResponse {
  extraction: RollPhotoExtractionDto;
  matchedRoll: RubberRollIssuanceRollDto | null;
  supplierResolved: string | null;
}

export class RubberRollIssuanceRollDto {
  id: number;
  rollNumber: string;
  compoundCode: string | null;
  compoundName: string | null;
  weightKg: number;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  status: string;
}

export class JcSearchResultDto {
  id: number;
  jcNumber: string | null;
  jobNumber: string;
  jobName: string;
  customerName: string | null;
  status: string;
}

export class JcLineItemDto {
  id: number;
  itemNo: string | null;
  itemCode: string | null;
  itemDescription: string | null;
  quantity: number | null;
  m2: number | null;
}

export class CreateRollIssuanceLineItemDto {
  @IsNumber()
  lineItemId: number;

  @IsOptional()
  @IsString()
  itemDescription?: string | null;

  @IsOptional()
  @IsString()
  itemNo?: string | null;

  @IsOptional()
  @IsNumber()
  quantity?: number | null;

  @IsOptional()
  @IsNumber()
  m2?: number | null;
}

export class CreateRollIssuanceItemDto {
  @IsNumber()
  jobCardId: number;

  @IsString()
  jcNumber: string;

  @IsOptional()
  @IsString()
  jobName?: string | null;

  @IsArray()
  lineItems: CreateRollIssuanceLineItemDto[];
}

export class CreateRollIssuanceDto {
  @IsNumber()
  rollStockId: number;

  @IsString()
  issuedBy: string;

  @IsOptional()
  @IsString()
  photoPath?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  jobCards: CreateRollIssuanceItemDto[];
}

export class CreateRollFromPhotoDto {
  @IsString()
  rollNumber: string;

  @IsOptional()
  @IsString()
  compoundCode?: string | null;

  @IsNumber()
  weightKg: number;

  @IsOptional()
  @IsNumber()
  widthMm?: number | null;

  @IsOptional()
  @IsNumber()
  thicknessMm?: number | null;

  @IsOptional()
  @IsNumber()
  lengthM?: number | null;
}

export class RubberRollIssuanceDto {
  id: number;
  rollStockId: number;
  rollNumber: string;
  compoundCode: string | null;
  issuedBy: string;
  issuedAt: string;
  rollWeightAtIssueKg: number;
  totalEstimatedUsageKg: number | null;
  expectedReturnKg: number | null;
  photoPath: string | null;
  notes: string | null;
  status: RollIssuanceStatus;
  statusLabel: string;
  items: RubberRollIssuanceItemDto[];
  createdAt: string;
}

export class RubberRollIssuanceItemDto {
  id: number;
  jobCardId: number;
  jcNumber: string;
  jobName: string | null;
  lineItems: RubberRollIssuanceLineItemDto[];
}

export class RubberRollIssuanceLineItemDto {
  id: number;
  lineItemId: number;
  itemDescription: string | null;
  itemNo: string | null;
  quantity: number | null;
  m2: number | null;
  estimatedWeightKg: number | null;
}
