import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { IsFutureOrTodayDate, IsZAPhone } from "../../shared/validators";
import { RfqStatus } from "../entities/rfq.entity";

export class CreateRfqDto {
  @ApiProperty({
    description: "Project name",
    example: "500NB Pipeline Extension",
  })
  @IsString()
  projectName: string;

  @ApiProperty({ description: "Project description", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Customer company name", required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ description: "Customer email", required: false })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({ description: "Customer phone number", required: false })
  @IsOptional()
  @IsString()
  @IsZAPhone()
  customerPhone?: string;

  @ApiProperty({ description: "Required delivery date", required: false })
  @IsOptional()
  @IsDateString()
  @IsFutureOrTodayDate()
  requiredDate?: string;

  @ApiProperty({ description: "RFQ status", enum: RfqStatus, required: false })
  @IsOptional()
  @IsEnum(RfqStatus)
  status?: RfqStatus;

  @ApiProperty({ description: "Additional notes", required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
