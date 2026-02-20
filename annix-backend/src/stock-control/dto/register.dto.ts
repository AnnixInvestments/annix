import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { StockControlRole } from "../entities/stock-control-user.entity";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(StockControlRole)
  role?: StockControlRole;
}
