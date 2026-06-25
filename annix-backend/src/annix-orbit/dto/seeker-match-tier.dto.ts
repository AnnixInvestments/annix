import { MATCH_TIERS } from "@annix/product-data/sa-market";
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export const MAX_TRIAL_DAYS = 30;

export class SetSeekerMatchTierDto {
  @IsEmail()
  email!: string;

  @IsIn([...MATCH_TIERS])
  tier!: string;
}

export class InviteSeekerTrialDto {
  @IsEmail()
  email!: string;

  @IsIn([...MATCH_TIERS])
  tier!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_TRIAL_DAYS)
  freeDays!: number;
}

export class SetPendingSeekerTierDto {
  @IsEmail()
  email!: string;

  @IsIn([...MATCH_TIERS])
  tier!: string;

  @IsBoolean()
  permanent!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_TRIAL_DAYS)
  trialDays?: number;
}
