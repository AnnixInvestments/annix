import { IsEmail, IsNotEmpty } from "class-validator";

export class AnnixSentinelResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
