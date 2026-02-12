import { PartialType } from '@nestjs/swagger';
import { CreateFittingTypeDto } from './create-fitting-type.dto';

export class UpdateFittingTypeDto extends PartialType(CreateFittingTypeDto) {}
