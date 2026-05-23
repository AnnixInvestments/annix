import { MATCH_TIERS } from "@annix/product-data/sa-market";
import { IsEmail, IsIn } from "class-validator";

export class SetSeekerMatchTierDto {
  @IsEmail()
  email!: string;

  @IsIn([...MATCH_TIERS])
  tier!: string;
}
