import { IsBoolean } from "class-validator";

export class UpdateOrbitBillingModuleDto {
  @IsBoolean()
  enabled: boolean;
}
