import { PartialType } from '@nestjs/swagger';
import { CreateFlangeDimensionDto } from './create-flange-dimension.dto';

export class UpdateFlangeDimensionDto extends PartialType(CreateFlangeDimensionDto) {}
