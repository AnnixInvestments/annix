import { IsNotEmpty, IsString } from "class-validator";

export class AnnixSentinelVerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
