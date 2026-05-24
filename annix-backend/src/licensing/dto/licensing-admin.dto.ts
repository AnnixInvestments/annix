import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class SetTierPricingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  annualPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  includedSeats?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  aiDocAllowance?: number;

  @IsOptional()
  @IsIn(["public", "hidden", "contact-us"])
  visibility?: string;
}

export class SetTierFeaturesDto {
  @IsArray()
  @IsString({ each: true })
  featureKeys: string[];
}

export class SetAddOnDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPriceCents?: number;

  @IsOptional()
  @IsBoolean()
  discountable?: boolean;
}
