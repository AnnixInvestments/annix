import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { CompanyType } from "../entities/rubber-company.entity";
import {
  CompoundMovementReferenceType,
  CompoundMovementType,
} from "../entities/rubber-compound-movement.entity";
import { RubberCompoundOrderStatus } from "../entities/rubber-compound-order.entity";
import { RubberOrderStatus, StatusHistoryEvent } from "../entities/rubber-order.entity";
import { CallOff } from "../entities/rubber-order-item.entity";
import { ProductCodingType } from "../entities/rubber-product-coding.entity";
import { RubberProductionStatus } from "../entities/rubber-production.entity";

export class RubberProductCodingDto {
  id: number;
  firebaseUid: string;
  codingType: ProductCodingType;
  code: string;
  name: string;
}

export class CreateRubberProductCodingDto {
  @IsEnum(ProductCodingType)
  codingType: ProductCodingType;

  @IsString()
  code: string;

  @IsString()
  name: string;
}

export class UpdateRubberProductCodingDto {
  @IsOptional()
  @IsEnum(ProductCodingType)
  codingType?: ProductCodingType;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class RubberPricingTierDto {
  id: number;
  name: string;
  pricingFactor: number;
}

export class CreateRubberPricingTierDto {
  @IsString()
  name: string;

  @IsNumber()
  pricingFactor: number;
}

export class UpdateRubberPricingTierDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  pricingFactor?: number;
}

export type CompanyAddressDto = Record<string, string>;

export class RubberCompanyDto {
  id: number;
  firebaseUid: string;
  name: string;
  companyType: CompanyType;
  code: string | null;
  pricingTierId: number | null;
  pricingTierName: string | null;
  pricingFactor: number | null;
  availableProducts: string[];
  isCompoundOwner: boolean;
  vatNumber: string | null;
  registrationNumber: string | null;
  address: CompanyAddressDto | null;
  notes: string | null;
}

export class CreateRubberCompanyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  pricingTierId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableProducts?: string[];

  @IsOptional()
  @IsBoolean()
  isCompoundOwner?: boolean;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsObject()
  address?: CompanyAddressDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRubberCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  pricingTierId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableProducts?: string[];

  @IsOptional()
  @IsBoolean()
  isCompoundOwner?: boolean;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsObject()
  address?: CompanyAddressDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RubberProductDto {
  id: number;
  firebaseUid: string;
  title: string | null;
  description: string | null;
  specificGravity: number | null;
  compoundOwnerName: string | null;
  compoundOwnerFirebaseUid: string | null;
  compoundName: string | null;
  compoundFirebaseUid: string | null;
  typeName: string | null;
  typeFirebaseUid: string | null;
  costPerKg: number | null;
  colourName: string | null;
  colourFirebaseUid: string | null;
  hardnessName: string | null;
  hardnessFirebaseUid: string | null;
  curingMethodName: string | null;
  curingMethodFirebaseUid: string | null;
  gradeName: string | null;
  gradeFirebaseUid: string | null;
  markup: number | null;
  pricePerKg: number | null;
}

export class CreateRubberProductDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  specificGravity?: number;

  @IsOptional()
  @IsString()
  compoundOwnerFirebaseUid?: string;

  @IsOptional()
  @IsString()
  compoundFirebaseUid?: string;

  @IsOptional()
  @IsString()
  typeFirebaseUid?: string;

  @IsOptional()
  @IsNumber()
  costPerKg?: number;

  @IsOptional()
  @IsString()
  colourFirebaseUid?: string;

  @IsOptional()
  @IsString()
  hardnessFirebaseUid?: string;

  @IsOptional()
  @IsString()
  curingMethodFirebaseUid?: string;

  @IsOptional()
  @IsString()
  gradeFirebaseUid?: string;

  @IsOptional()
  @IsNumber()
  markup?: number;
}

export class UpdateRubberProductDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  specificGravity?: number;

  @IsOptional()
  @IsString()
  compoundOwnerFirebaseUid?: string;

  @IsOptional()
  @IsString()
  compoundFirebaseUid?: string;

  @IsOptional()
  @IsString()
  typeFirebaseUid?: string;

  @IsOptional()
  @IsNumber()
  costPerKg?: number;

  @IsOptional()
  @IsString()
  colourFirebaseUid?: string;

  @IsOptional()
  @IsString()
  hardnessFirebaseUid?: string;

  @IsOptional()
  @IsString()
  curingMethodFirebaseUid?: string;

  @IsOptional()
  @IsString()
  gradeFirebaseUid?: string;

  @IsOptional()
  @IsNumber()
  markup?: number;
}

export class RubberOrderItemDto {
  id: number;
  productId: number | null;
  productTitle: string | null;
  thickness: number | null;
  width: number | null;
  length: number | null;
  quantity: number | null;
  callOffs: CallOff[];
  kgPerRoll: number | null;
  totalKg: number | null;
}

export class CreateRubberOrderItemDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

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
  quantity?: number;

  @IsOptional()
  @IsArray()
  callOffs?: CallOff[];
}

export class UpdateRubberOrderItemDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

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
  quantity?: number;

  @IsOptional()
  @IsArray()
  callOffs?: CallOff[];
}

export class RubberOrderDto {
  id: number;
  orderNumber: string;
  companyOrderNumber: string | null;
  status: RubberOrderStatus;
  statusLabel: string;
  companyId: number | null;
  companyName: string | null;
  items: RubberOrderItemDto[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  statusHistory: StatusHistoryEvent[];
}

export class CreateRubberOrderDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  companyOrderNumber?: string;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubberOrderItemDto)
  items?: CreateRubberOrderItemDto[];
}

export class UpdateRubberOrderDto {
  @IsOptional()
  @IsString()
  companyOrderNumber?: string;

  @IsOptional()
  @IsEnum(RubberOrderStatus)
  status?: RubberOrderStatus;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubberOrderItemDto)
  items?: CreateRubberOrderItemDto[];
}

export class RubberRollCalculationDto {
  thickness: number;
  width: number;
  length: number;
  specificGravity: number;
  quantity: number;
  kgPerRoll: number;
  totalKg: number;
  pricePerKg: number;
  totalPrice: number;
}

export class RubberPriceCalculationRequestDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  companyId: number;

  @IsNumber()
  thickness: number;

  @IsNumber()
  width: number;

  @IsNumber()
  length: number;

  @IsNumber()
  quantity: number;
}

export class RubberPriceCalculationDto {
  productTitle: string | null;
  companyName: string | null;
  specificGravity: number;
  costPerKg: number;
  markup: number;
  pricePerKg: number;
  pricingFactor: number;
  salePricePerKg: number;
  kgPerRoll: number;
  totalKg: number;
  totalPrice: number;
}

export class ImportProductRowDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  compound?: string;

  @IsOptional()
  @IsString()
  colour?: string;

  @IsOptional()
  @IsString()
  hardness?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  curingMethod?: string;

  @IsOptional()
  @IsString()
  compoundOwner?: string;

  @IsOptional()
  @IsNumber()
  specificGravity?: number;

  @IsOptional()
  @IsNumber()
  costPerKg?: number;

  @IsOptional()
  @IsNumber()
  markup?: number;

  @IsOptional()
  @IsString()
  firebaseUid?: string;
}

export class ImportProductsRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductRowDto)
  rows: ImportProductRowDto[];

  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean;
}

export class ImportProductRowResultDto {
  rowIndex: number;
  status: "created" | "updated" | "failed" | "skipped";
  title: string | null;
  errors: string[];
  productId?: number;
}

export class ImportProductsResultDto {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  results: ImportProductRowResultDto[];
}

export class RubberCompoundStockDto {
  id: number;
  firebaseUid: string;
  compoundCodingId: number;
  compoundName: string | null;
  compoundCode: string | null;
  quantityKg: number;
  minStockLevelKg: number;
  reorderPointKg: number;
  costPerKg: number | null;
  location: string | null;
  batchNumber: string | null;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CreateRubberCompoundStockDto {
  @IsNumber()
  compoundCodingId: number;

  @IsOptional()
  @IsNumber()
  quantityKg?: number;

  @IsOptional()
  @IsNumber()
  minStockLevelKg?: number;

  @IsOptional()
  @IsNumber()
  reorderPointKg?: number;

  @IsOptional()
  @IsNumber()
  costPerKg?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;
}

export class UpdateRubberCompoundStockDto {
  @IsOptional()
  @IsNumber()
  compoundCodingId?: number;

  @IsOptional()
  @IsNumber()
  quantityKg?: number;

  @IsOptional()
  @IsNumber()
  minStockLevelKg?: number;

  @IsOptional()
  @IsNumber()
  reorderPointKg?: number;

  @IsOptional()
  @IsNumber()
  costPerKg?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;
}

export class RubberCompoundMovementDto {
  id: number;
  compoundStockId: number;
  compoundName: string | null;
  movementType: CompoundMovementType;
  quantityKg: number;
  referenceType: CompoundMovementReferenceType;
  referenceId: number | null;
  batchNumber: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export class ReceiveCompoundDto {
  @IsNumber()
  compoundStockId: number;

  @IsNumber()
  quantityKg: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdjustCompoundDto {
  @IsNumber()
  compoundStockId: number;

  @IsNumber()
  quantityKg: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RubberProductionDto {
  id: number;
  firebaseUid: string;
  productionNumber: string;
  productId: number;
  productTitle: string | null;
  compoundStockId: number;
  compoundName: string | null;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  quantity: number;
  compoundRequiredKg: number;
  compoundUsedKg: number | null;
  status: RubberProductionStatus;
  statusLabel: string;
  orderId: number | null;
  notes: string | null;
  createdBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CreateRubberProductionDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  compoundStockId: number;

  @IsNumber()
  thicknessMm: number;

  @IsNumber()
  widthMm: number;

  @IsNumber()
  lengthM: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  orderId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CalculateCompoundDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  thicknessMm: number;

  @IsNumber()
  widthMm: number;

  @IsNumber()
  lengthM: number;

  @IsNumber()
  quantity: number;
}

export class CompoundCalculationResultDto {
  productTitle: string | null;
  specificGravity: number;
  compoundRequiredKg: number;
  kgPerUnit: number;
}

export class RubberCompoundOrderDto {
  id: number;
  firebaseUid: string;
  orderNumber: string;
  compoundStockId: number;
  compoundName: string | null;
  quantityKg: number;
  status: RubberCompoundOrderStatus;
  statusLabel: string;
  isAutoGenerated: boolean;
  supplierName: string | null;
  expectedDelivery: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CreateRubberCompoundOrderDto {
  @IsNumber()
  compoundStockId: number;

  @IsNumber()
  quantityKg: number;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsDateString()
  expectedDelivery?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRubberCompoundOrderStatusDto {
  @IsEnum(RubberCompoundOrderStatus)
  status: RubberCompoundOrderStatus;
}

export class ReceiveCompoundOrderDto {
  @IsNumber()
  actualQuantityKg: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
