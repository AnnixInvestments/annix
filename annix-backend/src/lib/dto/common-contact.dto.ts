import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class CommonContactDto {
  @ApiPropertyOptional({ description: "Contact first name" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional({ description: "Contact last name" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @ApiPropertyOptional({ description: "Full contact name (when first/last not split)" })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  fullName?: string;

  @ApiPropertyOptional({ description: "Contact email address" })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: "Contact phone number (E.164 preferred)" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ description: "Contact role / job title" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;
}
