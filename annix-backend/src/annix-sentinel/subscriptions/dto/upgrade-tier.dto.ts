import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class AnnixSentinelUpgradeTierDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(["starter", "professional", "enterprise"])
  tier!: string;
}
