import { IsEmail } from "class-validator";

export class ComplySaResendVerificationDto {
  @IsEmail()
  email!: string;
}
