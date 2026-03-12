import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class ComplySaUpgradeTierDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(["starter", "professional", "enterprise"])
  tier!: string;
}
