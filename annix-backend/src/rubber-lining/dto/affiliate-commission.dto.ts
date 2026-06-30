import { IsEmail, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateAffiliateDto {
  @IsString()
  name: string;

  @IsString()
  contactName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAffiliateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSalesRepDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSalesRepDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateCommissionPayoutDto {
  @IsString()
  commissionType: string;

  @IsOptional()
  @IsNumber()
  salesRepId?: number;

  @IsOptional()
  @IsNumber()
  affiliateId?: number;

  @IsNumber()
  invoiceId: number;

  @IsNumber()
  customerId: number;

  @IsString()
  customerName: string;

  @IsString()
  invoiceNumber: string;

  @IsNumber()
  invoiceTotal: number;

  @IsNumber()
  commissionRate: number;

  @IsNumber()
  commissionAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePayoutStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  paidBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UploadPriceListDto {
  @IsOptional()
  @IsNumber()
  affiliateId?: number;
}

export class AffiliateResponseDto {
  id: number;
  companyId: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export class SalesRepResponseDto {
  id: number;
  companyId: number;
  name: string;
  email: string;
  phone: string;
  commissionPercent: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export class CommissionPayoutResponseDto {
  id: number;
  companyId: number;
  commissionType: string;
  salesRepId: number;
  affiliateId: number;
  invoiceId: number;
  customerId: number;
  customerName: string;
  invoiceNumber: string;
  invoiceTotal: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  releaseSource: string;
  bankReconId: number;
  paidAt: string;
  paidBy: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export class AffiliatePriceListResponseDto {
  id: number;
  affiliateId: number;
  originalFilename: string;
  status: string;
  itemCount: number;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
}

export class AffiliatePriceListItemResponseDto {
  id: number;
  priceListId: number;
  productCode: string;
  productDescription: string;
  elongation: string;
  sg: number;
  mpa: string;
  colour: string;
  cureType: string;
  minPrice: number;
  unit: string;
}
