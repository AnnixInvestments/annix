import { PartialType } from '@nestjs/swagger';
import { CreateFittingDimensionDto } from './create-fitting-dimension.dto';

export class UpdateFittingDimensionDto extends PartialType(CreateFittingDimensionDto) {}
