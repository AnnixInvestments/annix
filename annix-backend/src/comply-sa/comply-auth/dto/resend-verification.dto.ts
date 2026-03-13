import { IsEmail, IsNotEmpty } from "class-validator";

export class ComplySaResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
