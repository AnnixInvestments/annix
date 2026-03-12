import { IsNotEmpty, IsString } from "class-validator";

export class ComplySaVerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
