import { IsEmail } from "class-validator";

export class ComplySaForgotPasswordDto {
  @IsEmail()
  email!: string;
}
