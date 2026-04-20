import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { ContactType } from "../entities/contact.entity";

export class CreateContactDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: ContactType })
  @IsEnum(ContactType)
  contactType: ContactType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vatNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  addressJsonb?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  emailConfig?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  availableProducts?: string[];
}

export class UpdateContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: ContactType })
  @IsOptional()
  @IsEnum(ContactType)
  contactType?: ContactType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vatNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  addressJsonb?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  emailConfig?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  availableProducts?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sageContactId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sageContactType?: string;
}

export class ContactFilterDto {
  @ApiPropertyOptional({ enum: ContactType })
  @IsOptional()
  @IsEnum(ContactType)
  contactType?: ContactType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  hasSageMapping?: boolean;
}
