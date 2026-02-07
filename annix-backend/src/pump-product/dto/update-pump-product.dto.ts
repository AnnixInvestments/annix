import { PartialType } from "@nestjs/swagger";
import { CreatePumpProductDto } from "./create-pump-product.dto";

export class UpdatePumpProductDto extends PartialType(CreatePumpProductDto) {}
