import { ApiSchema } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

@ApiSchema({ name: "StockControlCreateCustomerDto" })
export class CreateCustomerDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  customerCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vatNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  registrationNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  streetAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  province?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  country?: string | null;
}

@ApiSchema({ name: "StockControlUpdateCustomerDto" })
export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  customerCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vatNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  registrationNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  streetAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  province?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  country?: string | null;
}
