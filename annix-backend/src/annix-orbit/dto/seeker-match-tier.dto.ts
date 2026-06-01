import { MATCH_TIERS } from "@annix/product-data/sa-market";
import { IsEmail, IsIn, IsInt, Min } from "class-validator";

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
  freeDays!: number;
}
