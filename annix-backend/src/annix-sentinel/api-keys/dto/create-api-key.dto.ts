import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class AnnixSentinelCreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
