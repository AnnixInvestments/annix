import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

const DISCOUNT_TYPES = ["percentage", "fixed_amount"] as const;
const BILLING_CYCLES = ["monthly", "annual", "any"] as const;
const DURATIONS = ["first_payment", "n_months", "forever"] as const;

export class CreatePromoCodeDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  moduleKey?: string;

  @IsIn(DISCOUNT_TYPES)
  discountType: "percentage" | "fixed_amount";

  @IsInt()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToTiers?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  assignedCompanyIds?: number[];

  @IsOptional()
  @IsIn(BILLING_CYCLES)
  billingCycle?: "monthly" | "annual" | "any";

  @IsOptional()
  @IsIn(DURATIONS)
  discountDuration?: "first_payment" | "n_months" | "forever";

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMonths?: number;

  @IsOptional()
  @IsString()
  grantsTier?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePromoCodeDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: "percentage" | "fixed_amount";

  @IsOptional()
  @IsInt()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToTiers?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  assignedCompanyIds?: number[];

  @IsOptional()
  @IsIn(BILLING_CYCLES)
  billingCycle?: "monthly" | "annual" | "any";

  @IsOptional()
  @IsIn(DURATIONS)
  discountDuration?: "first_payment" | "n_months" | "forever";

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMonths?: number;

  @IsOptional()
  @IsString()
  grantsTier?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
