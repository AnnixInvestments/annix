import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';

export enum RfqStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  QUOTED = 'QUOTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class RfqQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Search project name or customer name

  @IsOptional()
  @IsEnum(RfqStatus)
  status?: RfqStatus;

  @IsOptional()
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
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
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
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
  documentCount?: number;
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
