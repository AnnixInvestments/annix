import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateJobCardDto } from "./create-job-card.dto";

export class UpdateJobCardDto extends PartialType(CreateJobCardDto) {
  @ApiPropertyOptional({ description: "Skip TDS verification check when activating" })
  @IsOptional()
  @IsBoolean()
  skipTdsCheck?: boolean;
}
