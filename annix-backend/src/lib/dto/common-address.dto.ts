import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CommonAddressDto {
  @ApiPropertyOptional({ description: "Street address (street + number)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  streetAddress?: string;

  @ApiPropertyOptional({ description: "City or town" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ description: "Province or state" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provinceState?: string;

  @ApiPropertyOptional({ description: "Postal or ZIP code" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: "ISO-3166 alpha-2 country code", example: "ZA" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;
}
