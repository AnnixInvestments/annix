import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SubmitFeedbackDto {
  @ApiProperty({
    description: "Feedback content from the customer",
    example: "The RFQ form is missing an option for flanged ends.",
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  content: string;

  @ApiProperty({
    description: "Source of the feedback submission",
    example: "text",
    enum: ["text", "voice"],
  })
  @IsString()
  @IsIn(["text", "voice"])
  source: "text" | "voice";

  @ApiPropertyOptional({
    description: "URL of the page where feedback was submitted",
    example: "/customer/portal/rfqs/create",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  pageUrl?: string;
}

export class SubmitFeedbackResponseDto {
  @ApiProperty({ description: "Feedback record ID" })
  id: number;

  @ApiProperty({ description: "GitHub issue number" })
  githubIssueNumber: number;

  @ApiProperty({ description: "GitHub issue URL" })
  githubIssueUrl: string;

  @ApiProperty({ description: "Success message" })
  message: string;
}
