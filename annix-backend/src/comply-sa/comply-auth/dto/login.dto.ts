import { IsEmail, IsString } from "class-validator";

export class ComplySaLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
