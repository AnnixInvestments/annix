import { PartialType } from "@nestjs/swagger";
import { CreateValveRfqDto } from "./create-valve-rfq.dto";

export class UpdateValveRfqDto extends PartialType(CreateValveRfqDto) {}
