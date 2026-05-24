import { IsEmail, IsString } from "class-validator";

export class AnnixSentinelLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
