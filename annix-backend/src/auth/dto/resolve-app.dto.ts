import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class ResolveAppDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export type ResolvedApp = "stock-control" | "au-rubber";

export class ResolveAppResponseDto {
  app: ResolvedApp;
}
