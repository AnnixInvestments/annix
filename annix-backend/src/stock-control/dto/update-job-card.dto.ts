import { PartialType } from "@nestjs/swagger";
import { CreateJobCardDto } from "./create-job-card.dto";

export class UpdateJobCardDto extends PartialType(CreateJobCardDto) {}
