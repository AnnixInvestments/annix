import { PartialType } from '@nestjs/swagger';
import { CreateFlangePressureClassDto } from './create-flange-pressure-class.dto';

export class UpdateFlangePressureClassDto extends PartialType(CreateFlangePressureClassDto) {}
