import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ComplySaResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @MinLength(8)
  password!: string;
}
