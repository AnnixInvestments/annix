import { IsEmail } from "class-validator";

export class AnnixSentinelForgotPasswordDto {
  @IsEmail()
  email!: string;
}
