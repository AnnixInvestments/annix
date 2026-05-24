import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class AnnixSentinelResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
