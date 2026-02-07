import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsOptional } from "class-validator";

export class AssignReviewerDto {
  @ApiProperty({ description: "User ID of the reviewer to assign" })
  @IsNumber()
  reviewerUserId: number;

  @ApiPropertyOptional({
    description: "Due date for the review (ISO 8601 format)",
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
