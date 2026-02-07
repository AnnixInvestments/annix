import { PartialType } from "@nestjs/swagger";
import { CreatePumpRfqDto } from "./create-pump-rfq.dto";

export class UpdatePumpRfqDto extends PartialType(CreatePumpRfqDto) {}
