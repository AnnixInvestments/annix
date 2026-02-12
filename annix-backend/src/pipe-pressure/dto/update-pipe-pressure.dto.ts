import { PartialType } from '@nestjs/swagger';
import { CreatePipePressureDto } from './create-pipe-pressure.dto';

export class UpdatePipePressureDto extends PartialType(CreatePipePressureDto) {}
