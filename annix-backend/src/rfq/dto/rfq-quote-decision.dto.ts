import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class RejectRfqQuoteDto {
  @ApiPropertyOptional({
    description: "Optional free-text reason the customer is rejecting the quote",
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reason?: string;
}
