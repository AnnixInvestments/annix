import { PartialType } from '@nestjs/swagger';
import { CreatePipeDimensionDto } from './create-pipe-dimension.dto';

export class UpdatePipeDimensionDto extends PartialType(CreatePipeDimensionDto) {}
