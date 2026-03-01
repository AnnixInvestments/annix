import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { AuCocStatus } from "../entities/rubber-au-coc.entity";
import { BatchPassFailStatus } from "../entities/rubber-compound-batch.entity";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  ExtractedDeliveryNoteData,
} from "../entities/rubber-delivery-note.entity";
import { RollStockStatus } from "../entities/rubber-roll-stock.entity";
import {
  CocProcessingStatus,
  ExtractedCocData,
  SupplierCocType,
} from "../entities/rubber-supplier-coc.entity";

export class RubberSupplierCocDto {
  id: number;
  firebaseUid: string;
  cocType: SupplierCocType;
  cocTypeLabel: string;
  supplierCompanyId: number;
  supplierCompanyName: string | null;
  documentPath: string;
  graphPdfPath: string | null;
  cocNumber: string | null;
  productionDate: string | null;
  compoundCode: string | null;
  orderNumber: string | null;
  ticketNumber: string | null;
  processingStatus: CocProcessingStatus;
  processingStatusLabel: string;
  extractedData: ExtractedCocData | null;
  reviewNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  linkedDeliveryNoteId: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CreateSupplierCocDto {
  @IsEnum(SupplierCocType)
  cocType: SupplierCocType;

  @IsOptional()
  @IsNumber()
  supplierCompanyId?: number;

  @IsString()
  documentPath: string;

  @IsOptional()
  @IsString()
  graphPdfPath?: string | null;

  @IsOptional()
  @IsString()
  cocNumber?: string | null;

  @IsOptional()
  @IsDateString()
  productionDate?: string | null;

  @IsOptional()
  @IsString()
  compoundCode?: string | null;

  @IsOptional()
  @IsString()
  orderNumber?: string | null;

  @IsOptional()
  @IsString()
  ticketNumber?: string | null;
}

export class UpdateSupplierCocDto {
  @IsOptional()
  @IsString()
  graphPdfPath?: string | null;

  @IsOptional()
  @IsString()
  cocNumber?: string | null;

  @IsOptional()
  @IsDateString()
  productionDate?: string | null;

  @IsOptional()
  @IsString()
  compoundCode?: string | null;

  @IsOptional()
  @IsString()
  orderNumber?: string | null;

  @IsOptional()
  @IsString()
  ticketNumber?: string | null;

  @IsOptional()
  @IsEnum(CocProcessingStatus)
  processingStatus?: CocProcessingStatus;
}

export class ReviewExtractionDto {
  @IsOptional()
  extractedData?: ExtractedCocData;

  @IsOptional()
  @IsEnum(CocProcessingStatus)
  processingStatus?: CocProcessingStatus;
}

export class RubberCompoundBatchDto {
  id: number;
  firebaseUid: string;
  supplierCocId: number;
  supplierCocNumber: string | null;
  batchNumber: string;
  compoundStockId: number | null;
  compoundStockName: string | null;
  shoreAHardness: number | null;
  specificGravity: number | null;
  reboundPercent: number | null;
  tearStrengthKnM: number | null;
  tensileStrengthMpa: number | null;
  elongationPercent: number | null;
  rheometerSMin: number | null;
  rheometerSMax: number | null;
  rheometerTs2: number | null;
  rheometerTc90: number | null;
  passFailStatus: BatchPassFailStatus | null;
  passFailStatusLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CreateCompoundBatchDto {
  @IsNumber()
  supplierCocId: number;

  @IsString()
  batchNumber: string;

  @IsOptional()
  @IsNumber()
  compoundStockId?: number | null;

  @IsOptional()
  @IsNumber()
  shoreAHardness?: number | null;

  @IsOptional()
  @IsNumber()
  specificGravity?: number | null;

  @IsOptional()
  @IsNumber()
  reboundPercent?: number | null;

  @IsOptional()
  @IsNumber()
  tearStrengthKnM?: number | null;

  @IsOptional()
  @IsNumber()
  tensileStrengthMpa?: number | null;

  @IsOptional()
  @IsNumber()
  elongationPercent?: number | null;

  @IsOptional()
  @IsNumber()
  rheometerSMin?: number | null;

  @IsOptional()
  @IsNumber()
  rheometerSMax?: number | null;

  @IsOptional()
  @IsNumber()
  rheometerTs2?: number | null;

  @IsOptional()
  @IsNumber()
  rheometerTc90?: number | null;

  @IsOptional()
  @IsEnum(BatchPassFailStatus)
  passFailStatus?: BatchPassFailStatus | null;
}

export class RubberDeliveryNoteDto {
  id: number;
  firebaseUid: string;
  deliveryNoteType: DeliveryNoteType;
  deliveryNoteTypeLabel: string;
  deliveryNoteNumber: string;
  deliveryDate: string | null;
  supplierCompanyId: number;
  supplierCompanyName: string | null;
  documentPath: string | null;
  status: DeliveryNoteStatus;
  statusLabel: string;
  linkedCocId: number | null;
  linkedCocNumber: string | null;
  extractedData: ExtractedDeliveryNoteData | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CreateDeliveryNoteDto {
  @IsEnum(DeliveryNoteType)
  deliveryNoteType: DeliveryNoteType;

  @IsString()
  deliveryNoteNumber: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string | null;

  @IsNumber()
  supplierCompanyId: number;

  @IsOptional()
  @IsString()
  documentPath?: string | null;
}

export class UpdateDeliveryNoteDto {
  @IsOptional()
  @IsString()
  deliveryNoteNumber?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string | null;

  @IsOptional()
  @IsEnum(DeliveryNoteStatus)
  status?: DeliveryNoteStatus;

  @IsOptional()
  @IsNumber()
  linkedCocId?: number | null;
}

export class DeliveryNoteItemDto {
  id: number;
  firebaseUid: string;
  deliveryNoteId: number;
  batchNumberStart: string | null;
  batchNumberEnd: string | null;
  weightKg: number | null;
  rollNumber: string | null;
  rollWeightKg: number | null;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  linkedBatchIds: number[];
  createdAt: string;
  updatedAt: string;
}

export class CreateDeliveryNoteItemDto {
  @IsNumber()
  deliveryNoteId: number;

  @IsOptional()
  @IsString()
  batchNumberStart?: string | null;

  @IsOptional()
  @IsString()
  batchNumberEnd?: string | null;

  @IsOptional()
  @IsNumber()
  weightKg?: number | null;

  @IsOptional()
  @IsString()
  rollNumber?: string | null;

  @IsOptional()
  @IsNumber()
  rollWeightKg?: number | null;

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

export class RubberRollStockDto {
  id: number;
  firebaseUid: string;
  rollNumber: string;
  compoundCodingId: number | null;
  compoundCode: string | null;
  compoundName: string | null;
  weightKg: number;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  status: RollStockStatus;
  statusLabel: string;
  linkedBatchIds: number[];
  deliveryNoteItemId: number | null;
  soldToCompanyId: number | null;
  soldToCompanyName: string | null;
  auCocId: number | null;
  reservedBy: string | null;
  reservedAt: string | null;
  soldAt: string | null;
  location: string | null;
  notes: string | null;
  costZar: number | null;
  priceZar: number | null;
  productionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CreateRollStockDto {
  @IsString()
  rollNumber: string;

  @IsOptional()
  @IsNumber()
  compoundCodingId?: number | null;

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

  @IsOptional()
  @IsArray()
  linkedBatchIds?: number[];

  @IsOptional()
  @IsNumber()
  deliveryNoteItemId?: number | null;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsNumber()
  costZar?: number | null;

  @IsOptional()
  @IsNumber()
  priceZar?: number | null;
}

export class UpdateRollStockDto {
  @IsOptional()
  @IsNumber()
  compoundCodingId?: number | null;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  widthMm?: number | null;

  @IsOptional()
  @IsNumber()
  thicknessMm?: number | null;

  @IsOptional()
  @IsNumber()
  lengthM?: number | null;

  @IsOptional()
  @IsEnum(RollStockStatus)
  status?: RollStockStatus;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ReserveRollDto {
  @IsNumber()
  customerId: number;

  @IsOptional()
  @IsString()
  reservedBy?: string;
}

export class SellRollDto {
  @IsNumber()
  customerId: number;

  @IsOptional()
  @IsString()
  poNumber?: string;
}

export class RubberAuCocDto {
  id: number;
  firebaseUid: string;
  cocNumber: string;
  customerCompanyId: number;
  customerCompanyName: string | null;
  poNumber: string | null;
  deliveryNoteRef: string | null;
  status: AuCocStatus;
  statusLabel: string;
  generatedPdfPath: string | null;
  sentToEmail: string | null;
  sentAt: string | null;
  createdBy: string | null;
  notes: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: RubberAuCocItemDto[];
}

export class RubberAuCocItemDto {
  id: number;
  firebaseUid: string;
  auCocId: number;
  rollStockId: number;
  rollNumber: string | null;
  createdAt: string;
}

export class CreateAuCocDto {
  @IsNumber()
  customerCompanyId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  rollIds: number[];

  @IsOptional()
  @IsString()
  poNumber?: string | null;

  @IsOptional()
  @IsString()
  deliveryNoteRef?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  approvedByName?: string | null;
}

export class SendAuCocDto {
  @IsString()
  email: string;
}

export class RollTraceabilityDto {
  roll: RubberRollStockDto;
  batches: RubberCompoundBatchDto[];
  supplierCocs: RubberSupplierCocDto[];
  auCoc: RubberAuCocDto | null;
}

export class CreateOpeningStockDto {
  @IsString()
  rollNumber: string;

  @IsNumber()
  compoundCodingId: number;

  @IsNumber()
  weightKg: number;

  @IsOptional()
  @IsNumber()
  costZar?: number | null;

  @IsOptional()
  @IsNumber()
  priceZar?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ImportOpeningStockRowDto {
  @IsString()
  rollNumber: string;

  @IsString()
  compoundCode: string;

  @IsNumber()
  weightKg: number;

  @IsOptional()
  @IsNumber()
  costZar?: number | null;

  @IsOptional()
  @IsNumber()
  priceZar?: number | null;
}

export class ImportOpeningStockResultDto {
  totalRows: number;
  created: number;
  errors: { row: number; rollNumber: string; error: string }[];
}
