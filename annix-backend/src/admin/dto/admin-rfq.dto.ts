import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

export enum RfqStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  QUOTED = "QUOTED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  UNREGISTERED = "UNREGISTERED",
}

export class RfqQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Search project name or customer name

  @IsOptional()
  @IsEnum(RfqStatus)
  status?: RfqStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsString()
  dateFrom?: string; // ISO date string

  @IsOptional()
  @IsString()
  dateTo?: string; // ISO date string

  @IsOptional()
  @IsString()
  sortBy?: string; // 'createdAt' | 'projectName' | 'status'

  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class RfqListItemDto {
  id: number;
  projectName: string;
  customerName: string;
  customerEmail: string;
  status: string;
  isUnregistered?: boolean;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
  documentCount?: number;
  requiredDate?: Date;
  isPastDeadline?: boolean;
}

export class RfqListResponseDto {
  items: RfqListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class RfqDetailDto {
  id: number;
  projectName: string;
  description?: string;
  requiredDate?: Date;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: string;
  isUnregistered?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: number;
    email: string;
    name: string;
  };
}

export class RfqItemDetailDto {
  id: number;
  type: string; // STRAIGHT_PIPE, BEND, FITTING, FLANGE, CUSTOM
  quantity: number;
  weightPerUnit?: number;
  totalWeight?: number;
  unitPrice?: number;
  totalPrice?: number;
  specifications?: any; // StraightPipeRfq or BendRfq data
}

export class RfqDocumentDto {
  id: number;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy?: {
    id: number;
    email: string;
    name: string;
  };
}

export class RfqFullDraftDto {
  id: number;
  draftNumber: string;
  projectName?: string;
  currentStep: number;
  completionPercentage: number;
  isConverted: boolean;
  convertedRfqId?: number;
  formData: Record<string, any>;
  globalSpecs?: Record<string, any>;
  requiredProducts?: string[];
  straightPipeEntries?: Record<string, any>[];
  pendingDocuments?: Record<string, any>[];
  createdAt: Date;
  updatedAt: Date;
}
